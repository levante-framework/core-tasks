import 'regenerator-runtime/runtime';
import store from 'store2';
// setup
import { initTrialSaving, initTimeline, createPreloadTrials, prepareCorpus, prepareMultiBlockCat } from '../shared/helpers';
import { jsPsych, initializeCat } from '../taskSetup';
import { slider } from './trials/sliderStimulus';
import { afcStimulusTemplate, enterFullscreen, exitFullscreen, finishExperiment, getAudioResponse, setupStimulus, fixationOnly, setupStimulusFromBlock, taskFinished } from '../shared/trials';
import { getLayoutConfig } from './helpers/config';
import { taskStore } from '../../taskStore';


export default function buildMathTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const preloadTrials = createPreloadTrials(mediaAssets).default;

  initTrialSaving(config);
  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);

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

  const { runCat } = taskStore(); 
  const { semThreshold } = taskStore();

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
      if (stim.trialType === skipBlockTrialType && !runCat) {
        return false;
      } else {
        return true;
      }
    },
  };

  if (runCat) {
    // puts the CAT portion of the corpus into taskStore and removes instructions
    const fullCorpus = prepareCorpus(corpus); 

    // determines the trial types in each block - this should match indexes/trial types of blocks in corpus
    const trialTypesByBlock: string[][] = [
      ["Number Identification", "Number Comparison", "Missing Number", "Number Line 4afc"], 
      ["Addition", "Subtraction", "Fraction", "Multiplication"], 
      ["Number Line Slider"]
    ]
    const allBlocks: StimulusType[][] = prepareMultiBlockCat(taskStore().corpora.stimulus, trialTypesByBlock); 

    const newCorpora = {
      practice: taskStore().corpora.practice,
      stimulus: allBlocks
    }
    taskStore('corpora', newCorpora); // puts all blocks into taskStore

    const numOfBlocks = allBlocks.length; 
    for (let i = 0; i < numOfBlocks; i++) {
      // push in block-specific instructions 
      const instructionPractice = fullCorpus.instructionPractice.filter(trial => {
        return trial.block_index === i.toString();
      });
      instructionPractice.forEach((trial) => {
        timeline.push(fixationOnly);
        timeline.push(afcStimulusTemplate(trialConfig, trial));
      });

      const numOfTrials = allBlocks[i].length / 2; // we want to run 50% of the trials in each block
      for (let j = 0; j < numOfTrials; j++) {
        timeline.push(setupStimulusFromBlock(i)); // select only from the current block
        timeline.push(stimulusBlock);
      }
    }
  } else {
    const numOfTrials = taskStore().totalTrials;
    for (let i = 0; i < numOfTrials; i++) {
      timeline.push(setupStimulus);
      timeline.push(stimulusBlock);
    }
  }

  

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
