import store from 'store2';

/**
 * @typedef {Object} TaskStore
 * @property {string} itemSelect - Identifier for the selected item, default is 'mfi'. Options include: ['mfi', 'random'].
 * @property {number} trialNumSubtask - Counter for trials in the current subtask, starting at 0.
 * @property {number} testTrialCount - Counter for test trials run, starting at 0.
 * @property {number} numIncorrect - Counter for incorrect responses, starting at 0.
 * @property {number} totalCorrect - Counter for total correct trials, starting at 0.
 * @property {Array} correctItems - List of correct items, starting as an empty array.
 * @property {string} audioFeedback - Audio feedback to use, default is 'neutral'.
 * @property {boolean} skipInstructions - Whether to skip instructions, default is true.
 * @property {string} corpusId - Name of the corpus file.
 * @property {string} buttonLayout - Layout of the buttons, default is 'default'.
 * @property {string} task - Name of the task, default is 'egma-math'.
 * @property {number} maxIncorrect - Maximum number of incorrect trials, default is 3.
 * @property {boolean} keyHelpers - Whether to use keyboard helpers, default is true.
 * @property {boolean} runCat - Whether to run task adaptively as a CAT, default is false
 * @property {boolean} heavyInstructions - Whether to start with heavy instructions for younger kids
 * @property {boolean} storeItemId - Whether to store the item ID, default is false.
 * @property {boolean} isRoarApp - Whether the app is running in ROAR mode, default is false.
 * @property {boolean} maxTimeReached - Whether the max time has been reached, default is false.
 * @property {boolean} taskComplete - Whether the task has ended - if true, the user should return to dashboard.
 * ------- Added after config is parsed -------
 * @property {number} totalTrials - Total number trials, including practice and instructions.
 * @property {number} totalTestTrials - Total number of test trials in the experiment timeline.
 * @property {Object} corpora - Object containing the corpus data (stimulus).
 * @property {Object} translations - Object containing the translations.
 * @property {Object} nextStimulus - Object containing the next stimulus.
 * @property {boolean} testPhase - True if not running practice/instruction trial
 * ------- AFC and SDS only -------
 * @property {string} target - Target item.
 * @property {Array} choices - List of choices.
 * ------- AFC only -------
 * @property {boolean} skipCurrentTrial - Whether to skip the current trial, default is false.
 * @property {number} correctResponseIdx - Index of the correct response, starting at 0.
 * @property {number} incorrectPracticeResponses - Number of incorrect responses to the current practice trial.
 * ------- Math only -------
 * @property {Array} nonFractionSelections - List of non-fraction selections.
 * @property {number} trialsSkipped - Number of trials that have been skipped while jumping to the next block.
 * ------- H&F only -------
 * @property {string} stimulus - Name of the stimulus, default is 'heart'.
 * @property {string} stimulusSide - Side of the stimulus, default is 'left'.
 * @property {number} stimulusPosition - Position of the stimulus, default is 0.
 * ------- Memory Game only -------
 * @property {number} numOfBlocks - Number of blocks in the memory game, default is 4.
 * @property {number} blockSize - Size of each block in the memory game, default is 50.
 * @property {number} gridSize - Size of the grid in the memory game, default is 2x2.
 * ------- H&F & Memory Game only -------
 * @property {boolean} isCorrect - Whether the response to the previous trial was correct, default is false.
<<<<<<< HEAD
 * --------- ToM only ---------
 * @property {Array} previousChoices - Array containing previously randomized order of choices for the current block.
=======
 * ------- SDS only -------
 * @property {StimulusType[]} sequentialTrials - Should be run sequentially in blocks by trial number in an SDS CAT.
>>>>>>> main
 */

export type TaskStoreDataType = {
  audioFeedback: string;
  skipInstructions: boolean;
  corpusId?: string;
  corpus: string;
  stimulusBlocks: number;
  buttonLayout: string;
  task: string; // FIXME: tighten to task name strings
  maxIncorrect: number;
  keyHelpers: boolean;
  storeItemId: boolean;
  isRoarApp: boolean;
  userMetadata: {
    age: number;
  } & Record<string, any>;
  inferenceNumStories?: number; // FIXME: Remove
  cat: boolean;
  heavyInstructions: boolean;
  semThreshold: number;
  startingTheta: number;
  language?: string;
};

/**
 * Store for managing task state. For all tasks.
 *
 * @type {import('store2').StoreAPI & (() => TaskStore)}
 */
export const taskStore = store.page.namespace('taskStore');

export const setTaskStore = (config: TaskStoreDataType) => {
  taskStore({
    itemSelect: 'mfi',
    trialNumSubtask: 0,
    testTrialCount: 0,
    numIncorrect: 0,
    // For ROAR syntax (TROG)
    totalCorrect: 0,
    correctItems: [],
    // -----
    audioFeedback: config.audioFeedback,
    skipInstructions: config.skipInstructions,
    corpusId: config.corpusId,
    corpus: config.corpus,
    buttonLayout: config.buttonLayout,
    task: config.task,
    maxIncorrect: config.maxIncorrect,
    keyHelpers: config.keyHelpers,
    runCat: config.cat,
    heavyInstructions: config.heavyInstructions || config.userMetadata.age < 6,
    semThreshold: config.semThreshold,
    startingTheta: config.startingTheta,
    storeItemId: config.storeItemId,
    isRoarApp: config.isRoarApp,
    numOfBlocks: config.userMetadata.age > 4 ? 9 : 4,
    blockSize: config.userMetadata.age > 4 ? 30 : 50,
    stimulusBlocks: config.stimulusBlocks,
    gridSize: config.userMetadata.age > 4 ? 3 : 2,
    maxTimeReached: false,
    taskComplete: false,
    stimulus: 'heart',
    stimulusSide: 'left',
    stimulusPosition: 0,
    isCorrect: false,
    inferenceNumStories: config.inferenceNumStories,
    testPhase: false,
  });
};

// Leaving this for ROAR fork / documentation

// STATE
// audioFeedback: audioFeedback || 'neutral',
// skipInstructions: skipInstructions ?? true,
// comes from getCorpus after parsing the corpus
// corpora
// For ROAR. The name of the corpus file.
// corpusId: corpusId,
// buttonLayout: buttonLayout || 'default',
// task: taskName ?? 'egma-math',
// maxIncorrect: maxIncorrect ?? 3,
// keyHelpers: keyHelpers ?? true,
// storeItemId: storeItemId,
// isRoarApp: isRoarApp(firekit)

// DONT NEED STATE FOR THESE
// userMetadata: { ...userMetadata, age },
// startTime: new Date(),
// firekit,
// displayElement: displayElement || null,
// sequentialPractice: sequentialPractice ?? true,
// sequentialStimulus: sequentialStimulus ?? true,
// // name of the csv files in the storage bucket
// corpus: corpus,
// numberOfTrials: numberOfTrials ?? 300,
// stimulusBlocks: stimulusBlocks ?? 3,
// numOfPracticeTrials: numOfPracticeTrials ?? 2,
// language: language ?? i18next.language,
// maxTime: maxTime || 100,
