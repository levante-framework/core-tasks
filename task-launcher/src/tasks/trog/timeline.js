import 'regenerator-runtime/runtime';
// setup
import store from 'store2';
import { initTrialSaving, initTimeline, createPreloadTrials } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import {
  afcStimulusWithTimeoutCondition,
  exitFullscreen,
  setupStimulusConditional,
  taskFinished,
} from '../shared/trials';

export default function buildTROGTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  // does not matter if trial has properties that don't belong to that type
  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
  };

  const stimulusBlock = {
    timeline: [afcStimulusWithTimeoutCondition(trialConfig)],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (store.session.get('skipCurrentTrial')) {
        store.session.set('skipCurrentTrial', false);
        return false;
      }
      return true;
    },
  };

  const timeline = [preloadTrials, initialTimeline];

  const numOfTrials = store.session.get('totalTrials');
  for (let i = 0; i < numOfTrials; i++) {
    timeline.push(setupStimulusConditional);
    timeline.push(stimulusBlock);
  }

  initializeCat();

  // final screens
  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
