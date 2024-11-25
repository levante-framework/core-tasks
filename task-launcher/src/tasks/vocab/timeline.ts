import 'regenerator-runtime/runtime';
// setup
// @ts-ignore
import { initTrialSaving, initTimeline, createPreloadTrials, taskStore } from '../shared/helpers';
// @ts-ignore
import { jsPsych, initializeCat, cat } from '../taskSetup';
// trials
// @ts-ignore
import { afcStimulusTemplate, exitFullscreen, setupStimulus, fixationOnly, taskFinished } from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { prepareCorpus, selectNItems } from '../shared/helpers/prepareCat';

export default function buildVocabTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config);
  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {}; 
  const { runCat } = taskStore();

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

  const stimulusBlock = {
    timeline: [
      setupStimulus,
      afcStimulusTemplate(trialConfig)
    ],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
        return false;
      }
      if (runCat && cat._seMeasurement < 0.3) {
        return false; 
      }
      return true;
    },
  };

  const timeline = [preloadTrials, initialTimeline];

  if (runCat) {
    // seperate out corpus to get cat/non-cat blocks
    const corpora = prepareCorpus(corpus);

    // instruction block (non-cat)
    corpora.instructionPractice.forEach((trial: StimulusType) => {
      timeline.push(fixationOnly); 
      timeline.push(afcStimulusTemplate(trialConfig, trial)); 
    });

    // cat block
    const numOfCatTrials = corpora.cat.length;
    for (let i = 0; i < numOfCatTrials; i++) {
      timeline.push(stimulusBlock);
    }
  
    // select up to 5 random items from unnormed portion of corpus 
    const unnormedTrials: StimulusType[] = selectNItems(corpora.unnormed, 5); 
  
    // random set of unvalidated items at end
    const unnormedBlock = {
      timeline: unnormedTrials.map((trial) => afcStimulusTemplate(trialConfig, trial))
    }
    timeline.push(unnormedBlock);
  } else {
    const numOfTrials = taskStore().totalTrials;
    for (let i = 0; i < numOfTrials; i++) {
      timeline.push(stimulusBlock);
    }
  }

  initializeCat();

  // final screens
  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
