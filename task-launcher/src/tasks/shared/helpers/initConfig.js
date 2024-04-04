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
    buttonLayout,
    numberOfTrials,
    taskName,
    stimulusBlocks,
    numOfPracticeTrials,
    maxIncorrect,
    keyHelpers,
    age,
    maxTime, // maximum app duration in minutes
    // storyCorpus,
    // story,
  } = cleanParams;

  const config = {
    userMetadata: { ...userMetadata, age },
    audioFeedback: audioFeedback || 'neutral',
    skipInstructions: skipInstructions ?? true,
    startTime: new Date(),
    firekit,
    displayElement: displayElement || null,
    sequentialPractice: sequentialPractice ?? true,
    sequentialStimulus: sequentialStimulus ?? true,
    // name of the csv files in the storage bucket
    corpus: corpus,
    buttonLayout: buttonLayout || 'default',
    numberOfTrials: numberOfTrials ?? 20,
    task: taskName ?? 'egma-math',
    stimulusBlocks: stimulusBlocks ?? 3,
    numOfPracticeTrials: numOfPracticeTrials ?? 2,
    maxIncorrect: maxIncorrect ?? 3,
    keyHelpers: keyHelpers ?? true,
    language: i18next.language,
    maxTime: maxTime || null, // default is no time limit
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

  return config;
};
