// Used in Math and Matrix-reasoning so far
import _omitBy from 'lodash/omitBy';
import _isNull from 'lodash/isNull';
import _isUndefined from 'lodash/isUndefined';
import i18next from 'i18next';
import { isRoarApp } from './isRoarApp';
import { camelize } from './camelize';
import { RoarAppkit } from '@bdelab/roar-firekit';

export const DEFAULT_LAYOUT_CONFIG: LayoutConfigType = {
  noAudio: false,
  staggered: {
    enabled: false,
    trialTypes: [],
  },
  classOverrides: {
    buttonContainerClassList: ['lev-response-row', 'multi-4'],
    buttonClassList: ['image'], 
    promptClassList: ['lev-row-container', 'instruction'],
    stimulusContainerClassList: ['lev-stim-content-x-3'],
  },
  prompt: {
    enabled: true,
    aboveStimulus: true,
  },
  equalSizeStim: false,
  disableButtonsWhenAudioPlaying: false,
  isPracticeTrial: false,
  isInstructionTrial: false,
  randomizeChoiceOrder: false,
  isStaggered: false,
  isImageButtonResponse: false,
  showStimImage: true,
  response: {
    target: '',
    displayValues: ['OK'],
    values: ['OK'],
    targetIndex: 0,
  },
  inCorrectTrialConfig: {
    onIncorrectTrial: 'end',
  },
};

const defaultCorpus: Record<string, string> = {
  egmaMath: 'math-item-bank',
  matrixReasoning: 'matrix-reasoning-item-bank',
  mentalRotation: 'mental-rotation-item-bank',
  sameDifferentSelection: 'same-different-selection-item-bank',
  trog: 'trog-item-bank',
  theoryOfMind: 'theory-of-mind-item-bank',
  vocab: 'vocab-item-bank',
};

export const setSharedConfig = async (firekit: RoarAppkit, gameParams: GameParamsType, userParams: UserParamsType, displayElement: HTMLElement) => {
  const cleanParams = _omitBy(_omitBy({ ...gameParams, ...userParams }, _isNull), _isUndefined);

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
  if (!config.corpus) {
    config.corpus = defaultCorpus[camelize(taskName)]
  };

  const updatedGameParams = Object.fromEntries(
    Object.entries(gameParams).map(([key, value]) => [key, config[key as keyof typeof config] ?? value]),
  );

  await config.firekit.updateTaskParams(updatedGameParams);

  return config;
};
