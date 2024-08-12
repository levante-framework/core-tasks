import 'regenerator-runtime/runtime';
// setup
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
import { instructions } from './trials/instructions';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { 
  afcStimulus, 
  exitFullscreen, 
  setupStimulus,
  taskFinished,
  getAudioResponse
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
    layoutConfig: {
      showPrompt: true
    }
  };

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
      if (stim.assessmentStage === 'practice_response' || stim.trialType === 'instructions') {
        return false;
      }
      return true;
    },
  };

  const stimulusBlock = (config) => ({
    timeline: [
      afcStimulus(config),
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
  });

  const timeline = [preloadTrials, initialTimeline, ...instructions];

  const numOfTrials = taskStore().totalTrials;
  for (let i = 0; i < numOfTrials; i += 1) {
    const finalTrialConfig = {
      ...trialConfig,
      // only the first 3 trials have audio
      layoutConfig: {
        noAudio: i > 2,
        staggered: {
          enabled: false,
          trialTypes: [],
        },
      },
    };
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock(finalTrialConfig));
    timeline.push(ifRealTrialResponse); 
  }

  initializeCat();

  timeline.push(taskFinished);
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
