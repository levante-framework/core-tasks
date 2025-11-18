import 'regenerator-runtime/runtime';
// setup
import { jsPsych, initializeCat, cat } from '../taskSetup';
import {
  createPreloadTrials,
  initTrialSaving,
  initTimeline,
  getRealTrials,
  batchTrials,
  batchMediaAssets,
  combineMediaAssets,
  filterMedia,
} from '../shared/helpers';
// trials
import {
  imageInstructions,
  polygonInstructions,
  threeDimInstructions,
  videoInstructionsFit,
  videoInstructionsMisfit,
} from './trials/instructions';
import {
  afcStimulusTemplate,
  taskFinished,
  exitFullscreen,
  setupStimulus,
  fixationOnly,
  getAudioResponse,
  enterFullscreen,
  finishExperiment,
  repeatInstructionsMessage,
  practiceTransition,
} from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { prepareCorpus, selectNItems } from '../shared/helpers/prepareCat';
import { taskStore } from '../../taskStore';
import { getLeftoverAssets } from '../shared/helpers/batchPreloading';
import { downexInstructions } from './trials/downexInstructions';

export default function buildMentalRotationTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const { runCat, heavyInstructions } = taskStore();
  const { semThreshold } = taskStore();
  let playedThreeDimInstructions = false;
  let playedPolygonInstructions = false;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
      if (runCat) {
        // this trial is never used after a practice trial when running in cat
        return true;
      }
      if (stim.assessmentStage === 'practice_response') {
        return false;
      }
      return true;
    },
  };

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

  // organize media assets into batches for preloading
  const batchSize = 25;
  const batchedCorpus = batchTrials(corpus, batchSize);
  const batchedMediaAssets = batchMediaAssets(mediaAssets, batchedCorpus, ['item', 'answer', 'distractors']);

  // counter for next batch to preload (skipping the initial preload)
  let currPreloadBatch = 0;
  const initialMedia = getLeftoverAssets(batchedMediaAssets, mediaAssets);

  const initialPreload = createPreloadTrials(runCat ? mediaAssets : initialMedia).default;
  const instructions = heavyInstructions ? 
    downexInstructions : 
    [imageInstructions, videoInstructionsMisfit, videoInstructionsFit];

  const timeline = [initialPreload, initialTimeline, ...instructions];

  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfig: {
      showPrompt: true,
    },
    layoutConfigMap,
  };

  // runs with adaptive algorithm if cat enabled
  const stimulusBlock = {
    timeline: [afcStimulusTemplate(trialConfig), ifRealTrialResponse],
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

  const repeatInstructions = {
    timeline: [repeatInstructionsMessage, imageInstructions, videoInstructionsMisfit, videoInstructionsFit],
    conditional_function: () => {
      return taskStore().numIncorrect >= 2;
    },
  };

  const threeDimInstructBlock = {
    timeline: [threeDimInstructions],
    conditional_function: () => {
      if (taskStore().nextStimulus.trialType === '3D' && !playedThreeDimInstructions) {
        playedThreeDimInstructions = true;
        return true;
      }

      return false;
    },
  };

  const polygonInstructBlock = {
    timeline: [polygonInstructions],
    conditional_function: () => {
      if (
        taskStore().nextStimulus.trialType === 'polygon' && 
        heavyInstructions &&
        !playedPolygonInstructions
      ) {
        playedPolygonInstructions = true;
        return true;
      }
    },
  };

  function preloadBatch() {
    timeline.push(createPreloadTrials(batchedMediaAssets[currPreloadBatch]).default);
    currPreloadBatch++;
  }

  if (runCat) {
    // seperate out corpus to get cat/non-cat blocks
    const corpora = prepareCorpus(corpus);

    // push in instruction block
    corpora.ipLight.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
    });

    // push in practice transition
    timeline.push(practiceTransition);

    // push in starting block
    corpora.start.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
      timeline.push(ifRealTrialResponse);
    });

    const numOfCatTrials = corpora.cat.length;
    taskStore('totalTestTrials', numOfCatTrials);
    for (let i = 0; i < numOfCatTrials; i++) {
      if (i === 2) {
        timeline.push(repeatInstructions);
      }
      timeline.push({ ...setupStimulus, stimulus: '' });
      timeline.push(threeDimInstructBlock);
      timeline.push(polygonInstructBlock);
      timeline.push(stimulusBlock);
    }

    const unnormedTrials: StimulusType[] = selectNItems(corpora.unnormed, 5);

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
      if (i === 4) {
        timeline.push(repeatInstructions);
      }
      timeline.push({ ...setupStimulus, stimulus: '' });
      timeline.push(practiceTransition);
      timeline.push(threeDimInstructBlock);
      timeline.push(polygonInstructBlock);
      timeline.push(stimulusBlock);
    }
  }

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
