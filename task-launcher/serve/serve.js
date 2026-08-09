import i18next from 'i18next';
import { TaskLauncher } from '../src';
import { initSentry } from '../src/sentry.js';
import { stringToBoolean } from '../src/tasks/shared/helpers/stringToBoolean';

// Import necessary in order to use async/await at the top level
import 'regenerator-runtime/runtime';

/**
 * Initialize Sentry first (no-op if a host client already exists).
 */
initSentry();

// TODO: Add game params for all tasks
const queryString = new URL(window.location).search;
const urlParams = new URLSearchParams(queryString);
const taskName = urlParams.get('task') ?? 'egma-math';
const corpus = urlParams.get('corpus');
const buttonLayout = urlParams.get('buttonLayout');
const numOfPracticeTrials = urlParams.get('practiceTrials');
const numberOfTrials = urlParams.get('trials') === null ? null : parseInt(urlParams.get('trials'), 10);
const maxIncorrect = urlParams.get('maxIncorrect') === null ? null : parseInt(urlParams.get('maxIncorrect'), 10);
const stimulusBlocks = urlParams.get('blocks') === null ? null : parseInt(urlParams.get('blocks'), 10);
const age = urlParams.get('age') === null ? null : parseInt(urlParams.get('age'), 10);
const maxTime = urlParams.get('maxTime') === null ? null : parseInt(urlParams.get('maxTime'), 10); // time limit for real trials
const language = urlParams.get('lng');
const pid = urlParams.get('pid');
const inferenceNumStories =
  urlParams.get('inferenceNumStories') === null ? null : parseInt(urlParams.get('inferenceNumStories'), 10);
const numberOfStories = urlParams.get('numberOfStories') === null ? 3 : parseInt(urlParams.get('numberOfStories'), 10);
const semThreshold = Number(urlParams.get('semThreshold') || '0');
const startingTheta = Number(urlParams.get('theta') || '0');
// `taskVersion` is deprecated; prefer `version` when both are present.
const versionFromQuery = urlParams.get('version') === null ? null : parseInt(urlParams.get('version'), 10);
const taskVersionFromQuery = urlParams.get('taskVersion') === null ? null : parseInt(urlParams.get('taskVersion'), 10);
const version = versionFromQuery ?? taskVersionFromQuery;

// Boolean parameters
const keyHelpers = stringToBoolean(urlParams.get('keyHelpers'));
const skipInstructions = stringToBoolean(urlParams.get('skip'), true);
const sequentialPractice = stringToBoolean(urlParams.get('sequentialPractice'), true);
const sequentialStimulus = stringToBoolean(urlParams.get('sequentialStimulus'), true);
const storeItemId = stringToBoolean(urlParams.get('storeItemId'), false);
const cat = stringToBoolean(urlParams.get('cat'), false);
const heavyInstructions = stringToBoolean(urlParams.get('heavyInstructions'), false);
const experimenterButtons = stringToBoolean(urlParams.get('experimenterButtons'), false);
const debug = stringToBoolean(urlParams.get('debug'), false);

// if running in demo mode, no data will be saved to Firestore
const demoMode = DEMO;

async function startWebApp() {
  const firekit = null;
  const gameParams = {
    taskName,
    skipInstructions,
    sequentialPractice,
    sequentialStimulus,
    corpus,
    buttonLayout,
    numOfPracticeTrials,
    numberOfTrials,
    maxIncorrect,
    stimulusBlocks,
    keyHelpers,
    language: language ?? i18next.language,
    age,
    maxTime,
    storeItemId,
    cat,
    inferenceNumStories,
    numberOfStories,
    semThreshold,
    startingTheta,
    heavyInstructions,
    demoMode,
    version,
    debug,
    experimenterButtons,
  };
  const userParams = {
    pid,
  };
  const task = new TaskLauncher(firekit, gameParams, userParams);
  task.run();
}

await startWebApp();
