// Used in Math and Matrix-reasoning so far
import _omitBy from 'lodash/omitBy';
import _isNull from 'lodash/isNull';
import _isUndefined from 'lodash/isUndefined';
import i18next from 'i18next';
import { camelize } from '@bdelab/roar-utils';

const defaultCorpus = {
  egmaMath: 'math-item-bank',
  matrixReasoning: 'matrix-reasoning-item-bank',
  mentalRotation: 'mental-rotation-item-bank',
  sameDifferentSelection: 'same-different-selection-item-bank',
  trog: 'trog-item-bank',
  theoryOfMind: 'theory-of-mind-item-bank',
};

export const initSharedConfig = async (firekit, gameParams, userParams, displayElement) => {
  const cleanParams = _omitBy(_omitBy({ ...gameParams, ...userParams }, _isNull), _isUndefined);

  const {
    userMetadata = {},
    audioFeedback,
    language = i18next.language,
    skipInstructions,
    sequentialPractice,
    sequentialStimulus,
    corpus,
    storeItemId,
    buttonLayout,
    numberOfTrials,
    taskName,
    stimulusBlocks,
    numOfPracticeTrials,
    maxIncorrect,
    keyHelpers,
    age,
    maxTime, // maximum app duration in minutes
    roarDefaults,  
    // storyCorpus,
    // story,
  } = cleanParams;

  const config = {
    userMetadata: { ...userMetadata, age },
    audioFeedback: audioFeedback || 'neutral',
    skipInstructions: skipInstructions,
    startTime: new Date(),
    firekit,
    displayElement: displayElement || null,
    sequentialPractice: sequentialPractice,
    sequentialStimulus: sequentialStimulus,
    // name of the csv files in the storage bucket
    corpus: corpus,
    storeItemId: storeItemId,
    buttonLayout: buttonLayout || 'default',
    numberOfTrials: numberOfTrials ?? roarDefaults ? null : 20,
    task: taskName ?? roarDefaults ? 'trog' : 'egma-math',
    stimulusBlocks: stimulusBlocks ?? 3,
    numOfPracticeTrials: numOfPracticeTrials ?? 2,
    maxIncorrect: maxIncorrect ?? roarDefaults ? 100 : 3,
    keyHelpers: keyHelpers ?? true,
    language: i18next.language,
    maxTime: maxTime || roarDefaults ? 8 : null, // default is no time limit
    roarDefaults: roarDefaults,
    // storyCorpus: storyCorpus ?? 'story-lion',
    // story: story ?? false,
  };

  // default corpus if nothing is passed in
  if (!config.corpus) config.corpus = defaultCorpus[camelize(taskName)];

  const updatedGameParams = Object.fromEntries(
    Object.entries(gameParams).map(([key, value]) => [key, config[key] ?? value]),
  );

  await config.firekit.updateTaskParams(updatedGameParams);

  if (config.pid !== null) {
    await config.firekit.updateUser({ assessmentPid: config.pid, ...userMetadata });
  }

  //console.log(config);
  return config;
};
