import 'regenerator-runtime/runtime';
// setup
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { 
  afcStimulus,
  exitFullscreen, 
  setupStimulus,
  taskFinished,
} from '../shared/trials';

export default function buildTOMTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  // does not matter if trial has properties that don't belong to that type
  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfig: {
      staggered: {
        enabled: true,
        trialTypes: [
          'false_belief_question',
          'reality_check_question',
          'emotion_reasoning_question',
          'reference_question',
          'attribution_question',
          'action_question',
        ],
      }, 
      showPrompt: true
    }
  };

  const stimulusBlock = {
    timeline: [
      afcStimulus(trialConfig)
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

  const timeline = [preloadTrials, initialTimeline];

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
