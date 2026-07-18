import 'regenerator-runtime/runtime';
import { taskStore } from '../../taskStore';
// setup
import {
  batchMediaAssets,
  batchTrials,
  createAwaitBackgroundBankTrial,
  createPreloadTrials,
  createProgressiveCatInitialPreload,
  getRealTrials,
  initTimeline,
  initTrialSaving,
  prepareCorpus,
  selectNItems,
} from '../shared/helpers';
import { preloadSharedAudio } from '../shared/helpers/preloadSharedAudio';
// trials
import {
  afcStimulusTemplate,
  enterFullscreen,
  exitFullscreen,
  fixationOnly,
  setupStimulus,
  taskFinished,
} from '../shared/trials';
import { cat, initializeCat, jsPsych } from '../taskSetup';
import { getLayoutConfig } from './helpers/config';

export default function buildVocabTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen);
  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {};
  const { runCat } = taskStore();
  const { semThreshold } = taskStore();

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

  // organize media assets into batches for preloading
  const batchSize = 25;
  const batchedCorpus = batchTrials(corpus, batchSize);
  const batchedMediaAssets = batchMediaAssets(mediaAssets, batchedCorpus, ['answer', 'distractors']);

  // counter for next batch to preload
  let currPreloadBatch = 0;

  // CAT: critical pack (instructions/practice) then background bank. Non-CAT: shared audio only.
  const corpora = runCat ? prepareCorpus(corpus) : null;
  const initialPreloadTrials = runCat
    ? createProgressiveCatInitialPreload(mediaAssets, {
        criticalTrials: corpora!.ipLight,
        imageFields: ['answer', 'distractors'],
        audioFields: ['audioFile'],
      })
    : [preloadSharedAudio()];

  // does not matter if trial has properties that don't belong to that type
  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfig: {
      showPrompt: false,
    },
    layoutConfigMap,
    terminateCat: false,
  };

  function preloadBatch() {
    timeline.push(createPreloadTrials(batchedMediaAssets[currPreloadBatch]).default);
    currPreloadBatch++;
  }

  const stimulusBlock = {
    timeline: [{ ...setupStimulus, stimulus: '' }, afcStimulusTemplate(trialConfig)],
    // true = execute normally, false = skip
    conditional_function: () => {
      if (taskStore().skipCurrentTrial) {
        taskStore('skipCurrentTrial', false);
        return false;
      }
      if (runCat && cat._seMeasurement < semThreshold) {
        return false;
      }
      return true;
    },
  };

  const timeline = [...initialPreloadTrials, initialTimeline];

  if (runCat && corpora) {
    // instruction / practice (critical pack already loaded)
    corpora.ipLight.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
    });

    // Wait for remaining bank before scored items
    timeline.push(createAwaitBackgroundBankTrial());

    // push in starting block
    corpora.start.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
    });

    // cat block
    const numOfCatTrials = corpora.cat.length;
    taskStore('totalTestTrials', numOfCatTrials);
    for (let i = 0; i < numOfCatTrials; i++) {
      timeline.push(stimulusBlock);
    }

    // select up to 5 random items from unnormed portion of corpus
    const unnormedTrials: StimulusType[] = selectNItems(corpora.unnormed, 5);

    // random set of unvalidated items at end
    const unnormedBlock = {
      timeline: unnormedTrials.map((trial) => afcStimulusTemplate(trialConfig, trial)),
    };
    timeline.push(unnormedBlock);
  } else {
    const numOfTrials = taskStore().totalTrials;
    taskStore('totalTestTrials', getRealTrials(corpus));
    for (let i = 0; i < numOfTrials; i++) {
      if (i % batchSize === 0) {
        preloadBatch();
      }

      timeline.push(stimulusBlock);
    }
  }

  initializeCat();

  // final screens
  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
