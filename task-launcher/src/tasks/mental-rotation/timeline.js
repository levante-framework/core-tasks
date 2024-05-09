import 'regenerator-runtime/runtime';
import store from 'store2';
import { initTrialSaving, initTimeline } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
import { createPreloadTrials } from '../shared/helpers';
// trials

import { afcStimulus, taskFinished } from '../shared/trials';
import { imageInstructions, nowYouTry, videoInstructionsFit, videoInstructionsMisfit } from './trials/instructions';
import { exitFullscreen, setupStimulusConditional, getAudioResponse } from '../shared/trials';

export default function buildMentalRotationTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const subTask = store.session.get('nextStimulus').notes;
      if (subTask === 'practice') {
        return false;
      }
      return true;
    },
  };

  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
  };

  const stimulusBlock = {
    timeline: [
      afcStimulusWithTimeoutCondition(trialConfig), 
      ifRealTrialResponse
    ],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (store.session.get('skipCurrentTrial')) {
        store.session.set('skipCurrentTrial', false);
        return false;
      } else {
        return true;
      }
    },
  };

  const timeline = [
    preloadTrials,
    initialTimeline,
    //instructions1, // adult instructions
    imageInstructions,
    videoInstructionsMisfit,
    videoInstructionsFit,
    //nowYouTry,
  ];

  const numOfTrials = store.session.get('totalTrials');
  for (let i = 0; i < numOfTrials; i++) {
    timeline.push(setupStimulusConditional);
    timeline.push(stimulusBlock);
  }

  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
