import 'regenerator-runtime/runtime';
import store from 'store2';
// setup
import { getStimulusCount, initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { afcStimulus } from '../shared/trials/afcStimulus';
import { slider } from './trials/sliderStimulus';
import { exitFullscreen } from '../shared/trials';
import { setupStimulus } from '../shared/trials';
import { instructions1, instructions2, taskFinished } from './trials/instructions';
import { getAudioResponse } from '../shared/trials';

export default function buildMathTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = store.session.get('nextStimulus');
      if (stim.notes === 'practice' || stim.trialType === 'instructions') {
        return false;
      }
      return true;
    },
  };

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
    conditional_function: () => {
      return !store.session.get('nextStimulus').trialType?.includes('Number Line');
    },
  };

  const sliderBlock = {
    timeline: [slider],
    conditional_function: () => {
      return store.session.get('nextStimulus').trialType?.includes('Number Line');
    },
  };

  const pushSubTaskToTimeline = (fixationAndSetupBlock, stimulusCounts, trialType) => {
    // loop through the list of trials per block within the subtest
    for (let i = 0; i < stimulusCounts.length; i++) {
      // add trials to the block (this is the core procedure for each trial)
      let surveyBlock;

      //if (trialType === 'practice') {
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
      //}

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
