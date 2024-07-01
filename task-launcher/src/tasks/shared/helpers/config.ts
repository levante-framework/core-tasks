// Used in Math and Matrix-reasoning so far
//@ts-ignore
import { camelize } from '@bdelab/roar-utils';
import { omitBy, isNull, isUndefined } from 'lodash';
import i18next from 'i18next';
import { isRoarApp } from "./isRoarApp";
import { RoarAppkit } from '@bdelab/roar-firekit';

export type GameParamsType = Record<string, any>;
export type UserParamsType = Record<string, any>;

const defaultCorpus = {
  egmaMath: 'math-item-bank',
  matrixReasoning: 'matrix-reasoning-item-bank',
  mentalRotation: 'mental-rotation-item-bank',
  sameDifferentSelection: 'same-different-selection-item-bank',
  trog: 'trog-item-bank',
  theoryOfMind: 'theory-of-mind-item-bank',
  vocab: 'vocab-item-bank',
};

export const setSharedConfig = async (firekit: RoarAppkit, gameParams: GameParamsType, userParams: UserParamsType, displayElement: boolean) => {
  const cleanParams = omitBy(omitBy({ ...gameParams, ...userParams }, isNull), isUndefined);

  const {
    userMetadata = {},
    audioFeedback,
    language,
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
    storeItemId,
  } = cleanParams;

  const config = {
    userMetadata: { ...userMetadata, age },
    audioFeedback: audioFeedback || 'neutral',
    skipInstructions: skipInstructions ?? true, // Not used in any task
    startTime: new Date(),
    firekit,
    displayElement: displayElement || null,
    sequentialPractice: sequentialPractice ?? true,
    sequentialStimulus: sequentialStimulus ?? true,
    // name of the csv files in the storage bucket
    corpus: corpus,
    buttonLayout: buttonLayout || 'default',
    numberOfTrials: numberOfTrials ?? 300,
    task: taskName ?? 'egma-math',
    stimulusBlocks: stimulusBlocks ?? 3,
    numOfPracticeTrials: numOfPracticeTrials ?? 2,
    maxIncorrect: maxIncorrect ?? 3,
    keyHelpers: keyHelpers ?? true,
    language: language ?? i18next.language,
    maxTime: maxTime || 100,
    storeItemId: storeItemId,
    isRoarApp: isRoarApp(firekit)
  };

  // default corpus if nothing is passed in
  if (!config.corpus) config.corpus = defaultCorpus[camelize(taskName) as keyof typeof defaultCorpus];

  const updatedGameParams = Object.fromEntries(
    Object.entries(gameParams).map(([key, value]) => [key, config[key as keyof typeof config] ?? value]),
  );

  await config.firekit.updateTaskParams(updatedGameParams);

  // if (config.pid !== null) {
  //   await config.firekit.updateUser({ assessmentPid: config.pid, ...userMetadata });
  // }

  return config;
};
