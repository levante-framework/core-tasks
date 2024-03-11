import 'regenerator-runtime/runtime';
import store from 'store2';
// setup
import { getStimulusCount, initTrialSaving, initTimeline, createPreloadTrials, isPractice } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { afcStimulus } from '../shared/trials/afcStimulus';
import { slider } from './trials/sliderStimulus';
import { exitFullscreen } from '../shared/trials';
import { setupPractice, setupStimulus } from '../shared/trials';
import { instructions1, instructions2, postPractice, taskFinished } from './trials/instructions';
import { audioResponse } from './trials/audioFeedback';

const ifRealTrialResponse = {
  timeline: [audioResponse],

  conditional_function: () => {
    const subTask = store.session.get("nextStimulus").notes;
    if (isPractice(subTask)) {
      return false;
    }
    return true;
  },
};

export default function buildMathTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const timeline = [
    preloadTrials,
    initialTimeline,
    instructions1, // for adult pilot, not kids
    instructions2,
  ];

  const afcStimulusBlock = {
    timeline: [
      afcStimulus({
        trialType: 'audio', // or 'html'
        responseAllowed: true,
        promptAboveButtons: true,
        task: config.task,
      }),
    ],
    conditional_function: () => !store.session.get('nextStimulus').trialType.includes('Number Line'),
  };

  const sliderBlock = {
    timeline: [slider],
    conditional_function: () => store.session.get('nextStimulus').trialType.includes('Number Line'),
  };

  const pushSubTaskToTimeline = (fixationAndSetupBlock, stimulusCounts, trialType) => {
    // loop through the list of trials per block within the subtest
    for (let i = 0; i < stimulusCounts.length; i++) {
      // add trials to the block (this is the core procedure for each trial)
      let surveyBlock;

      if (trialType === 'practice') {
        surveyBlock = {
          timeline: [fixationAndSetupBlock, afcStimulusBlock, sliderBlock, ifRealTrialResponse],
          conditional_function: () => {
            if (stimulusCounts[i] === 0) {
              return false;
            }
            store.session.set('currentBlockIndex', i);
            return true;
          },
          repetitions: stimulusCounts[i],
        };
      } else {
        surveyBlock = {
          timeline: [fixationAndSetupBlock, afcStimulusBlock, sliderBlock, ifRealTrialResponse],
          conditional_function: () => {
            if (stimulusCounts[i] === 0) {
              return false;
            }
            store.session.set('currentBlockIndex', i);
            return true;
          },
          repetitions: stimulusCounts[i],
        };
      }

      timeline.push(surveyBlock);
    }
  };

  initializeCat();

  // pushSubTaskToTimeline(
  //   setupPractice,
  //   [config.numOfPracticeTrials],
  //   "practice",
  // ); // Practice Trials

  // timeline.push(postPractice)

  pushSubTaskToTimeline(setupStimulus, getStimulusCount(), 'stimulus'); // Stimulus Trials

  timeline.push(taskFinished);

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
