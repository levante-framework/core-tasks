import 'regenerator-runtime/runtime';
// setup
import { 
  initTrialSaving, 
  initTimeline, 
  createPreloadTrials, 
  getRealTrials, 
  prepareMultiBlockCat, 
  batchMediaAssets, 
} from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
// trials
import {
  afcStimulusTemplate,
  exitFullscreen,
  setupStimulus,
  taskFinished,
  enterFullscreen,
  finishExperiment,
} from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { taskStore } from '../../taskStore';
import { preloadSharedAudio } from '../shared/helpers/preloadSharedAudio';

export default function buildTOMTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);
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
    layoutConfigMap,
  };

  const initialPreload = preloadSharedAudio();
  const timeline = [initialPreload, initialTimeline];

  const blockList = prepareMultiBlockCat(corpus);
  const batchedMediaAssets = batchMediaAssets(
    mediaAssets, 
    blockList,
    ['item', 'answer', 'distractors'], 
    ['audioFile', 'distractors'] // we need to preload audio for the staggered buttons
  );

  let currPreloadBatch = 0;
 
  // function to preload assets in batches at the beginning of each task block 
  function preloadBlock() {
    timeline.push(createPreloadTrials(batchedMediaAssets[currPreloadBatch]).default)
    currPreloadBatch ++; 
  };

  const stimulusBlock = {
    timeline: [afcStimulusTemplate(trialConfig)],
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

  taskStore('totalTestTrials', getRealTrials(corpus));
  blockList.forEach((block: StimulusType[]) => {
    preloadBlock();

    for (let i = 0; i < block.length; i++) {
      timeline.push({ ...setupStimulus, stimulus: '' });
      timeline.push(stimulusBlock);
    }
  });

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
