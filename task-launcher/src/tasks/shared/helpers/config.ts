// Used in Math and Matrix-reasoning so far

import type { RoarAppkit } from '@levante-framework/firekit';
import i18next from 'i18next';
import _isNull from 'lodash/isNull';
import _isUndefined from 'lodash/isUndefined';
import _omitBy from 'lodash/omitBy';
import type { TaskStoreDataType } from '../../../taskStore';
import { camelize } from './camelize';
import { getAge } from './getAge';
import { isRoarApp } from './isRoarApp';

export const DEFAULT_LAYOUT_CONFIG: LayoutConfigType = {
  playAudioOnLoad: true,
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
    displayValues: [],
    values: [],
    targetIndex: 0,
  },
  inCorrectTrialConfig: {
    onIncorrectTrial: 'end',
  },
  multiStimImage: false,
  disableOkButton: true,
  animationTimeControl: null,
  givePracticeFeedback: true,
};

const defaultCorpus: Record<string, string> = {
  egmaMath: 'math-item-bank',
  heartsAndFlowers: 'hearts-and-flowers-item-bank',
  matrixReasoning: 'matrix-reasoning-item-bank',
  memoryGame: 'memory-game-item-bank',
  mentalRotation: 'mental-rotation-item-bank',
  sameDifferentSelection: 'same-different-selection-item-bank',
  trog: 'trog-item-bank',
  theoryOfMind: 'theory-of-mind-item-bank',
  vocab: 'vocab-item-bank',
  adultReasoning: 'adult-reasoning-item-bank',
  hostileAttribution: 'hostile-attribution-item-bank',
  childSurvey: 'child-survey-item-bank',
};

// TODO: Hearts and Flowers v1 (any version but 2) predates its corpus and runs a shorter, untimed structure.
// utilities/render-live-corpora.mjs applies the same rule; keep the two in sync
// deprecate when v1 is obsolete and the corpus is no longer needed
const HEARTS_AND_FLOWERS_V1_CORPUS = 'hearts-and-flowers-v1-item-bank';

function getDefaultCorpus(taskName: string, version: number) {
  if (taskName === 'hearts-and-flowers' && version !== 2) return HEARTS_AND_FLOWERS_V1_CORPUS;
  return defaultCorpus[camelize(taskName)];
}

export const setSharedConfig = async (
  firekit: RoarAppkit | null,
  gameParams: GameParamsType,
  userParams: UserParamsType,
): Promise<TaskStoreDataType> => {
  const cleanParams = _omitBy(_omitBy({ ...gameParams, ...userParams }, _isNull), _isUndefined);

  const {
    userMetadata = {},
    birthMonth,
    birthYear,
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
    cat,
    heavyInstructions,
    experimenterButtons,
    showAudioKeys,
    numberOfStories,
    semThreshold,
    startingTheta,
    demoMode,
    debug,
    version,
    taskVersion, // deprecated; use `version` — kept for backward compatibility
    bubblePractice,
    bubblePracticeAgeLimit,
    _isPaused,
  } = cleanParams;

  const ageYears = Number(age) || getAge(Number(birthMonth), Number(birthYear));
  // Absent, blank, or non-numeric means the limit is unset.
  const ageLimit = Number(bubblePracticeAgeLimit);
  const ageLimitIsSet = bubblePracticeAgeLimit !== '' && Number.isFinite(ageLimit);

  const config = {
    userMetadata: { ...userMetadata, age: ageYears },
    audioFeedback: audioFeedback || 'neutral',
    skipInstructions: !!skipInstructions, // Not used in any task
    startTime: new Date(),
    firekit,
    sequentialPractice: sequentialPractice ?? true,
    sequentialStimulus: sequentialStimulus ?? true,
    // name of the csv files in the storage bucket
    corpus: corpus,
    buttonLayout: buttonLayout || 'default',
    numberOfTrials: numberOfTrials ?? 300,
    task: taskName ?? 'egma-math',
    stimulusBlocks: Number(stimulusBlocks) || 3,
    numOfPracticeTrials: Number(numOfPracticeTrials) || 2,
    maxIncorrect: Number(maxIncorrect) || 3,
    keyHelpers: !!keyHelpers,
    language: language ?? i18next.language,
    maxTime: Number(maxTime) || 100,
    storeItemId: !!storeItemId,
    isRoarApp: isRoarApp(firekit),

    cat: !!cat, // defaults to false
    heavyInstructions: !!heavyInstructions,
    // On unless a variant explicitly sets this false. Params are typed as strings but may be booleans at runtime.
    // The under-5 gate is applied in setTaskStore.
    experimenterButtons: String(experimenterButtons).trim().toLowerCase() !== 'false',
    showAudioKeys: !!showAudioKeys,
    numberOfStories: Number(numberOfStories) || 3,
    semThreshold: Number(semThreshold),
    startingTheta: Number(startingTheta),
    demoMode: !!demoMode,
    debug: !!debug,
    bubblePractice: !!bubblePractice && (!ageLimitIsSet || ageYears < ageLimit),
    version: Number((version ?? taskVersion) || 1),
    displayPromptDurations: {},
    taskTimer: null,
    isPaused: false,
  };

  // Default corpus for administrations whose variant has no corpus param.
  // This fallback will be deprecated eventually, once every variant names its corpus.
  if (!config.corpus) {
    config.corpus = getDefaultCorpus(taskName, config.version);
  }

  return config;
};
