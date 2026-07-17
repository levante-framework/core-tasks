// setup
import 'regenerator-runtime/runtime';
import { taskStore } from '../../taskStore';
import { batchMediaAssets, createPreloadTrials, initTimeline, initTrialSaving } from '../shared/helpers';
import { hasAudioSprites } from '../shared/helpers/audioSprites';
import { batchTrials, getLeftoverAssets } from '../shared/helpers/batchPreloading';
import { createTaskSpriteInitialPreload } from '../shared/helpers/createAudioSpritePreload';
import {
  enterFullscreen,
  exitFullscreen,
  feedback,
  getAudioResponse,
  setupStimulus,
  taskFinished,
} from '../shared/trials';
// trials
import { initializeCat, jsPsych } from '../taskSetup';
import { setTrialBlock } from './helpers/setTrialBlock';
import { afcMatch } from './trials/afcMatch';
import { legacyStimulus } from './trials/legacyStimulus';
import { stimulus } from './trials/stimulus';

export default function buildSameDifferentTimeline(config: Record<string, any>, mediaAssets: MediaAssetsType) {
  const heavy: boolean = taskStore().heavyInstructions;
  const locale = taskStore().language || 'en-US';
  const audioSpritesEnabled = taskStore().audioSprites !== false;

  let corpus: StimulusType[] = taskStore().corpora.stimulus;

  if (!heavy && taskStore().version === 2) {
    corpus = corpus.filter((trial) => {
      return !(trial.trialType.includes('something-same') && !(trial.assessmentStage === 'practice_response'));
    });

    taskStore('corpora', {
      practice: taskStore().corpora.practice,
      stimulus: corpus,
    });
  }

  // organize corpus into batches for preloading
  const batchSize = 25;
  const batchedCorpus = batchTrials(corpus, batchSize);
  const batchedMediaAssets = batchMediaAssets(mediaAssets, batchedCorpus, ['image', 'answer', 'distractors']);

  const initialMediaAssets = getLeftoverAssets(batchedMediaAssets, mediaAssets);
  initialMediaAssets.images = {}; // all sds images used in the task are specifed in corpus

  const initialPreloadTrials = createTaskSpriteInitialPreload(mediaAssets, {
    locale,
    task: 'same-different-selection',
    runCat: false,
    fallbackPreload: createPreloadTrials(initialMediaAssets).default,
    audioSpritesEnabled,
  });

  initTrialSaving(config);

  const initialTimeline = initTimeline(config, enterFullscreen);
  const timeline = [...initialPreloadTrials, initialTimeline];

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

  const feedbackBlock = {
    timeline: [feedback(true, 'feedbackCorrect', 'feedbackNotQuiteRight')],
    conditional_function: () => {
      return (
        taskStore().nextStimulus.assessmentStage === 'practice_response' &&
        !taskStore().nextStimulus.trialType.includes('something-same-1') &&
        taskStore().version === 2
      );
    },
  };

  const stimulusBlock = {
    timeline: [taskStore().version === 2 ? stimulus() : legacyStimulus(), feedbackBlock],
  };

  const afcBlock = {
    timeline: [afcMatch(), feedbackBlock],
  };

  // create list of numbers of trials per block
  const { blockCountList, blockOperations } = setTrialBlock(false);

  const totalRealTrials = blockCountList.reduce((acc, total) => acc + total, 0);
  taskStore('totalTestTrials', totalRealTrials);

  // counter for the next block to preload
  let currPreloadBatch = 0;

  // function to preload assets in batches at the beginning of each task block
  function preloadBlock() {
    const batch = batchedMediaAssets[currPreloadBatch];
    // Full audio+images when sprites unavailable (evaluated at runtime)
    timeline.push({
      timeline: [createPreloadTrials(batch).default],
      conditional_function: () => !hasAudioSprites(),
    });
    // Images only when sprites already cover audio (plugin SFX loaded in initial preload)
    timeline.push({
      timeline: [
        createPreloadTrials({ images: batch.images, audio: {}, video: batch.video || {} }).default,
      ],
      conditional_function: () => hasAudioSprites(),
    });
    currPreloadBatch++;
  }

  // functions to add trials to blocks of each type
  const updateTestDimensions = () => {
    timeline.push({ ...setupStimulus, stimulus: '' });
    timeline.push(stimulusBlock);
  };

  const setupTrialDuration = taskStore().version === 2 ? 0 : 350;

  const updateSomethingSame = () => {
    timeline.push({ ...setupStimulus, stimulus: '', trial_duration: setupTrialDuration });
    timeline.push(stimulusBlock);
    timeline.push(buttonNoise);
  };

  const updateMatching = () => {
    timeline.push({ ...setupStimulus, stimulus: '', trial_duration: setupTrialDuration });
    timeline.push(afcBlock);
    timeline.push(buttonNoise);
  };

  // map of block operation functions
  const blockFunctions = {
    updateTestDimensions,
    updateSomethingSame,
    updateMatching,
  };

  let trialCount = 0;

  // add trials to timeline according to block structure defined in blockOperations
  blockCountList.forEach((count, index) => {
    // push in trials
    for (let i = 0; i < count; i += 1) {
      // preload assets
      if (trialCount % batchSize === 0) {
        preloadBlock();
      }

      blockFunctions[blockOperations[index] as keyof typeof blockFunctions]();
      trialCount++;
    }
  });

  initializeCat();

  timeline.push(taskFinished());
  timeline.push(exitFullscreen);
  return { jsPsych, timeline };
}
