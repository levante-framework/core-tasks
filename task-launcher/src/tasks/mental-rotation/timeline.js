import 'regenerator-runtime/runtime';
import store from 'store2';
import { initTrialSaving, initTimeline } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
import { createPreloadTrials } from '../shared/helpers';
// trials
//import { stimulus } from "./trials/stimulus";
import { afcStimulus, afcCondtional } from '../shared/trials/afcStimulus';
import { instructions1, taskFinished } from './trials/instructions';
import { exitFullscreen, setupPractice, setupStimulus } from '../shared/trials';

export default function buildMentalRotationTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const practiceBlock = {
    timeline: [
      //setupPractice,
      //stimulus,
      afcStimulus({
        trialType: 'audio',
        responseAllowed: true,
        promptAboveButtons: true,
        task: config.task,
      }),
    ],
    repetitions: config.numOfPracticeTrials,
  };

  const stimulusBlock = {
    timeline: [
      setupStimulus,
      //stimulus
      afcStimulus({
        trialType: 'audio', 
        responseAllowed: true,
        promptAboveButtons: true,
        task: config.task,
      }),
    ],
    repetitions: store.session.get('maxStimulusTrials'),
  };

  const timeline = [
    preloadTrials,
    initialTimeline,
    instructions1,
    // practiceBlock,
    stimulusBlock,
    taskFinished,
  ];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
