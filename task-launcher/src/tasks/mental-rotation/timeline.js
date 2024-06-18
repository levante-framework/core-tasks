import 'regenerator-runtime/runtime';
import { initTrialSaving, initTimeline } from '../shared/helpers';
// setup
import { jsPsych } from '../taskSetup';
import { initializeCat } from '../taskSetup';
import { createPreloadTrials, taskStore } from '../shared/helpers';
// trials

import { afcStimulus, taskFinished } from '../shared/trials';
import { imageInstructions, nowYouTry, videoInstructionsFit, videoInstructionsMisfit } from './trials/instructions';
import { exitFullscreen, setupStimulus, getAudioResponse } from '../shared/trials';

export default function buildMentalRotationTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const subTask = taskStore().nextStimulus.notes;
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
      afcStimulus(trialConfig), 
      ifRealTrialResponse
    ],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
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

  const numOfTrials = taskStore().totalTrials;
  for (let i = 0; i < numOfTrials; i++) {
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock);
  }

  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
