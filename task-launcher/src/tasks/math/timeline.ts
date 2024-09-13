import 'regenerator-runtime/runtime';
import store from 'store2';
// setup
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
//@ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import { slider } from './trials/sliderStimulus';
//@ts-ignore
import { afcStimulusTemplate, exitFullscreen, getAudioResponse, setupStimulus, taskFinished } from '../shared/trials';
import { getLayoutConfig } from './helpers/config';


export default function buildMathTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

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

  const timeline = [
    preloadTrials,
    initialTimeline,
  ];

  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {};

  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  let i = 0;
  for (const c of corpus) {
    const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets, i);
    layoutConfigMap[c.itemId] = itemConfig;
    if (errorMessages.length) {
      validationErrorMap[c.itemId] = errorMessages.join('; ');
    }
    i += 1;
  }

  if (Object.keys(validationErrorMap).length) {
    console.error('The following errors were found');
    console.table(validationErrorMap);
    throw new Error('Something went wrong. Please look in the console for error details');
  }

  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfigMap,
  };

  const afcStimulusBlock = {
    timeline: [
      afcStimulusTemplate(trialConfig),
    ],
    conditional_function: () => {
      return !taskStore().nextStimulus.trialType?.includes('Number Line');
    },
  };

  const sliderBlock = {
    timeline: [slider],
    conditional_function: () => {
      return taskStore().nextStimulus.trialType?.includes('Number Line');
    },
  };

  const stimulusBlock = {
    timeline: [
      afcStimulusBlock,
      sliderBlock,
      ifRealTrialResponse,
    ],
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
        return false;
      }
      const stim = taskStore().nextStimulus;
      const skipBlockTrialType = store.page.get('skipCurrentBlock');
      if (stim.trialType === skipBlockTrialType) {
        return false;
      } else {
        return true;
      }
    },
  };

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
