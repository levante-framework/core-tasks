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

export default function buildMatrixTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

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
      } else {
        return true;
      }
    },
  };

  const timeline = [preloadTrials, initialTimeline];

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
