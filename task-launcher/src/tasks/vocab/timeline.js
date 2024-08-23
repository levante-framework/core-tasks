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

// checks if the user should continue the task
function checkContinue(){
  const maxIncorrect = taskStore().maxIncorrect; 
  const numIncorrect = taskStore().numIncorrect;

  return numIncorrect < maxIncorrect; 
}

export default function buildVocabTimeline(config, mediaAssets) {
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
      showPrompt: false
    }
  };

  const setup = {
    timeline: [setupStimulus], 

    conditional_function: () => {
      return checkContinue(); 
    }
  }

  const stimulusBlock = {
    timeline: [
      afcStimulus(trialConfig)
    ],
    // true = execute normally, false = skip
    conditional_function: () => { 

      if (taskStore().skipCurrentTrial || !checkContinue()) {
        taskStore('skipCurrentTrial', false);
        return false;
      }
      return true;
    },
  };

  const timeline = [preloadTrials, initialTimeline];

  const numOfTrials = taskStore().totalTrials;
  for (let i = 0; i < numOfTrials; i++) {
    timeline.push(setup);
    timeline.push(stimulusBlock);
  }

  initializeCat();

  // final screens
  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
