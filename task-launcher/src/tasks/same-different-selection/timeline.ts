// setup
import 'regenerator-runtime/runtime';
import { jsPsych } from '../taskSetup';
import { initTrialSaving, initTimeline, createPreloadTrials, filterMedia, batchMediaAssets } from '../shared/helpers';
import { prepareCorpus, prepareMultiBlockCat } from '../shared/helpers/prepareCat';
import { initializeCat } from '../taskSetup';
// trials
import { dataQualityScreen } from '../shared/trials/dataQuality';
import {
  setupStimulus,
  fixationOnly,
  exitFullscreen,
  taskFinished,
  getAudioResponse,
  enterFullscreen,
  finishExperiment,
  practiceTransition,
} from '../shared/trials';
import { afcMatch } from './trials/afcMatch';
import { stimulus } from './trials/stimulus';
import { taskStore } from '../../taskStore';
import {
  somethingSameDemo1,
  somethingSameDemo2,
  somethingSameDemo3,
  matchDemo1,
  matchDemo2,
  heavyPractice,
} from './trials/heavyInstructions';
import { setTrialBlock } from './helpers/setTrialBlock';
import { getLeftoverAssets } from '../shared/helpers/batchPreloading';

export default function buildSameDifferentTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const heavy: boolean = taskStore().heavyInstructions;

  const corpus: StimulusType[] = taskStore().corpora.stimulus;
  const preparedCorpus = prepareCorpus(corpus);

  // create list of trials in each block
  const blockList = prepareMultiBlockCat(corpus);

  const batchedMediaAssets = batchMediaAssets(mediaAssets, blockList, ['image', 'answer', 'distractors']);

  const initialMediaAssets = getLeftoverAssets(batchedMediaAssets, mediaAssets);
  initialMediaAssets.images = {}; // all sds images used in the task are specifed in corpus

  const initialPreload = createPreloadTrials(initialMediaAssets).default;

  initTrialSaving(config);

  const initialTimeline = initTimeline(config, enterFullscreen, finishExperiment);
  const timeline = [initialPreload, initialTimeline];

  const buttonNoise = {
    timeline: [getAudioResponse(mediaAssets)],

    conditional_function: () => {
      const trialType = taskStore().nextStimulus.trialType;
      const assessmentStage = taskStore().nextStimulus.assessmentStage;

      if (
        (trialType === 'something-same-2' || trialType.includes('match')) &&
        assessmentStage !== 'practice_response'
      ) {
        return true;
      }
      return false;
    },
  };

  // used for instruction and practice trials
  const ipBlock = (trial: StimulusType) => {
    return {
      timeline: [{ ...fixationOnly, stimulus: '' }, stimulus(trial)],
    };
  };

  const stimulusBlock = {
    timeline: [stimulus()],
  };

  const afcBlock = {
    timeline: [afcMatch],
  };

  const dataQualityBlock = {
    timeline: [dataQualityScreen],
    conditional_function: () => {
      return taskStore().numIncorrect >= taskStore().maxIncorrect && heavy;
    },
  };

  // all instructions + practice trials
  const instructionPractice: StimulusType[] = heavy ? preparedCorpus.ipHeavy : preparedCorpus.ipLight;

  // returns practice + instruction trials for a given block
  function getPracticeInstructions(blockNum: number): StimulusType[] {
    return instructionPractice.filter((trial) => trial.blockIndex == blockNum);
  }

  // create list of numbers of trials per block
  const blockCountList = setTrialBlock(false);

  const totalRealTrials = blockCountList.reduce((acc, total) => acc + total, 0);
  taskStore('totalTestTrials', totalRealTrials);

  // counter for the next block to preload
  let currPreloadBatch = 0;

  // function to preload assets in batches at the beginning of each task block
  function preloadBlock() {
    timeline.push(createPreloadTrials(batchedMediaAssets[currPreloadBatch]).default);
    currPreloadBatch++;
  }

  // functions to add trials to blocks of each type
  function updateTestDimensions() {
    timeline.push({ ...setupStimulus, stimulus: '' });
    timeline.push(stimulusBlock);
  }

  function updateSomethingSame() {
    timeline.push({ ...setupStimulus, stimulus: '' });
    timeline.push(stimulusBlock);
    timeline.push(buttonNoise);
    timeline.push(dataQualityBlock);
  }

  function updateMatching() {
    timeline.push({ ...setupStimulus, stimulus: '' });
    timeline.push(afcBlock);
    timeline.push(buttonNoise);
    timeline.push(dataQualityBlock);
  }

  // add to this list with any additional blocks
  const blockOperations = [
    updateTestDimensions,
    updateSomethingSame,
    updateMatching,
    updateTestDimensions,
    updateMatching,
    updateMatching,
  ];

  // preload next batch of assets at these blocks
  const preloadBlockIndexes = [0, 1, 2];

  // add trials to timeline according to block structure defined in blockOperations
  blockCountList.forEach((count, index) => {
    if (preloadBlockIndexes.includes(index)) {
      preloadBlock();
    }

    const currentBlockInstructionPractice = getPracticeInstructions(index);

    // push in instruction + practice trials
    if (index === 1 && heavy) {
      // something's the same block has demo trials in between instructions
      const firstInstruction = currentBlockInstructionPractice.shift();
      if (firstInstruction != undefined) {
        timeline.push(ipBlock(firstInstruction));
      }

      timeline.push(somethingSameDemo1);
      timeline.push(somethingSameDemo2);
      timeline.push(somethingSameDemo3);
      currentBlockInstructionPractice.forEach((trial) => {
        timeline.push(ipBlock(trial));
      });
      heavyPractice.forEach((trial) => {
        timeline.push(trial);
      });
      timeline.push({ ...practiceTransition(), conditional_function: () => true });
    } else {
      currentBlockInstructionPractice.forEach((trial) => {
        timeline.push(ipBlock(trial));
      });
    }

    if (index === 2 && heavy) {
      // 2-match has demo trials after instructions
      timeline.push(matchDemo1);
      timeline.push(matchDemo2);
    }

    for (let i = 0; i < count; i += 1) {
      blockOperations[index]();
    }
  });

  initializeCat();

  if (heavy) {
    timeline.push(dataQualityScreen);
  }
  timeline.push(taskFinished());
  timeline.push(exitFullscreen);
  return { jsPsych, timeline };
}
