import 'regenerator-runtime/runtime';
// setup
import {
  initTrialSaving,
  initTimeline,
  createPreloadTrials,
  getRealTrials,
  batchTrials,
  batchMediaAssets, 
} from '../shared/helpers';
import { downexInstructions1, downexInstructions2, instructions } from './trials/instructions';
import { downexStimulus } from './trials/downexStimulus';
import { jsPsych, initializeCat, cat } from '../taskSetup';
// trials
import {
  afcStimulusTemplate,
  exitFullscreen,
  setupStimulus,
  fixationOnly,
  taskFinished,
  getAudioResponse,
  enterFullscreen,
  finishExperiment,
  practiceTransition,
  setupDownex,
} from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { repeatInstructionsMessage } from '../shared/trials/repeatInstructions';
import { prepareCorpus, selectNItems } from '../shared/helpers/prepareCat';
import { taskStore } from '../../taskStore';
import { getLeftoverAssets } from '../shared/helpers/batchPreloading';

export default function buildMatrixTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

  const ifRealTrialResponse = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const stim = taskStore().nextStimulus;
      if (runCat) {
        return true;
      }
      if (stim.assessmentStage === 'practice_response' || stim.trialType === 'instructions') {
        return false;
      }
      return true;
    },
  };

  const defaultCorpus: StimulusType[] = taskStore().corpora.stimulus;
  const downexCorpus: StimulusType[] = taskStore().corpora.downex;
  const fullCorpus: StimulusType[] = [...downexCorpus, ...defaultCorpus];
  const translations: Record<string, string> = taskStore().translations;
  const validationErrorMap: Record<string, string> = {};
  const { semThreshold, heavyInstructions, runCat } = taskStore();

  const layoutConfigMap: Record<string, LayoutConfigType> = {};
  let i = 0;
  for (const c of fullCorpus) {
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

  // organize media assets into batches for preloading
  const batchSize = 25;
  const batchedCorpus = batchTrials(defaultCorpus, batchSize);
  const batchedMediaAssets = batchMediaAssets(mediaAssets, batchedCorpus, ['item', 'answer', 'distractors']);

  // counter for next batch to preload (skipping the initial preload)
  let currPreloadBatch = 0;

  const initialMedia = getLeftoverAssets(batchedMediaAssets, mediaAssets);
  console.log('initialMedia', initialMedia);
  const initialPreload = createPreloadTrials(runCat ? mediaAssets : initialMedia).default;

  const timeline = [
    initialPreload, 
    initialTimeline, 
    ...(heavyInstructions ? [downexInstructions1] : instructions)
  ];

  const trialConfig = {
    trialType: 'audio',
    responseAllowed: true,
    promptAboveButtons: true,
    task: config.task,
    layoutConfigMap,
  };

  const stimulusBlock = {
    timeline: [
      { ...setupStimulus, stimulus: '' },
      practiceTransition(),
      afcStimulusTemplate(trialConfig),
      ifRealTrialResponse,
    ],
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

  const downexBlock = {
    timeline: [
      { ...setupDownex, stimulus: '' },
      downexStimulus(layoutConfigMap),
      ifRealTrialResponse
    ]
  }

  const repeatInstructions = {
    timeline: [repeatInstructionsMessage, ...instructions],
    conditional_function: () => {
      return taskStore().numIncorrect >= 2;
    },
  };

  function preloadBatch() {
    timeline.push(createPreloadTrials(batchedMediaAssets[currPreloadBatch]).default);
    currPreloadBatch++;
  }

  if (runCat) {
    // seperate out corpus to get cat/non-cat blocks
    const corpora = prepareCorpus(defaultCorpus);

    // push in instruction block
    corpora.ipLight.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
    });

    // push in practice transition
    if (corpora.ipLight.filter((trial) => trial.assessmentStage === 'practice_response').length > 0) {
      timeline.push(practiceTransition());
    }

    // push in starting block
    corpora.start.forEach((trial: StimulusType) => {
      timeline.push({ ...fixationOnly, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig, trial));
      timeline.push(ifRealTrialResponse);
    });

    const numOfCatTrials = corpora.cat.length;
    taskStore('totalTestTrials', numOfCatTrials);
    for (let i = 0; i < numOfCatTrials; i++) {
      timeline.push({ ...setupStimulus, stimulus: '' });
      timeline.push(afcStimulusTemplate(trialConfig));
      timeline.push(ifRealTrialResponse);
    }

    const unnormedTrials: StimulusType[] = selectNItems(corpora.unnormed, 5);

    const unnormedBlock = {
      timeline: unnormedTrials.map((trial) => afcStimulusTemplate(trialConfig, trial)),
    };

    timeline.push(unnormedBlock);
  } else {
    const numOfDownexTrials = taskStore().totalDownexTrials;

    if (heavyInstructions) {
      for (let i = 0; i < numOfDownexTrials; i++) {
        timeline.push(downexBlock);
      }

      timeline.push(downexInstructions2);
    }
    
    const numOfTrials = taskStore().totalTrials;
    taskStore('totalTestTrials', heavyInstructions ? getRealTrials(defaultCorpus) + getRealTrials(downexCorpus) : getRealTrials(defaultCorpus));

    for (let i = 0; i < numOfTrials; i += 1) {
      if (i % batchSize === 0) {
        preloadBatch();
      }
      if (i === 4) {
        timeline.push(repeatInstructions);
      }
      timeline.push(stimulusBlock);
    }
  }
  

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);
  console.log('timeline', timeline);
  return { jsPsych, timeline };
}
