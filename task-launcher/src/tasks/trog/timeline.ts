import 'regenerator-runtime/runtime';
// setup
//@ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
//@ts-ignore
import { jsPsych, initializeCat } from '../taskSetup';
// trials
//@ts-ignore
import { afcStimulusTemplate, exitFullscreen, fixationOnly, setupStimulus, taskFinished } from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { prepareCorpus } from '../shared/helpers/prepareCat';

export default function buildTROGTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);
  const timeline = [preloadTrials, initialTimeline];
  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {}; 

  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  for (const c of corpus) {
    const { itemConfig, errorMessages } = getLayoutConfig(c, translations, mediaAssets);
    layoutConfigMap[c.itemId] = itemConfig;
    if (errorMessages.length) {
      validationErrorMap[c.itemId] = errorMessages.join('; ');
    }
  }

  if (Object.keys(validationErrorMap).length) {
    console.error('The following errors were found');
    console.table(validationErrorMap);
    throw new Error('Something went wrong. Please look in the console for error details');
  }

  // does not matter if trial has properties that don't belong to that type
  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfig: {
      showPrompt: false
    },
    layoutConfigMap,
  };

  // seperate out corpus to get cat/non-cat blocks
  const corpora = prepareCorpus(corpus);

  corpora.instructionPractice.forEach((trial: StimulusType) => {
    timeline.push(fixationOnly); 
    timeline.push(afcStimulusTemplate(trialConfig, trial)); 
  });

  const stimulusBlock = {
    timeline: [
      afcStimulusTemplate(trialConfig)
    ],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
        return false;
      }
      return true;
    },
  };

  const numOfCatTrials = corpora.cat.length;
  for (let i = 0; i < numOfCatTrials; i++) {
    timeline.push(setupStimulus);
    timeline.push(stimulusBlock);
  }

  const unnormedBlock = {
    timeline: corpora.unnormed.map((trial) => afcStimulusTemplate(trialConfig, trial))
  }

  timeline.push(unnormedBlock);

  initializeCat();

  // final screens
  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
