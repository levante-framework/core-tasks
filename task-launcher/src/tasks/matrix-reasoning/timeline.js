import 'regenerator-runtime/runtime';
// setup
import store from 'store2';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
// import { stimulus } from "./trials/stimulus";
import { afcStimulus, afcCondtional } from '../shared/trials/afcStimulus';
import { exitFullscreen, setupPractice, setupStimulus } from '../shared/trials';

export default function buildMatrixTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const practiceBlock = {
    timeline: [
      setupPractice,
      afcCondtional({
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
      afcCondtional({
        trialType: 'audio',
        responseAllowed: true,
        promptAboveButtons: true,
        task: config.task,
      }),
    ],
    repetitions: store.session.get('totalTrials'),
  };

  const timeline = [preloadTrials, initialTimeline, practiceBlock, stimulusBlock];

  initializeCat();

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
