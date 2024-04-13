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
import { instructions1, videoInstructions, taskFinished } from './trials/instructions';
import { exitFullscreen, setupPractice, setupStimulus } from '../shared/trials';
import { getAudioResponse } from '../shared/trials';

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
      ifRealTrialResponse,
    ],
    repetitions: store.session.get('totalTrials'),
  };

  const timeline = [preloadTrials, initialTimeline, instructions1, videoInstructions, stimulusBlock, taskFinished];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
