import { RoarAppkit, initializeFirebaseProject } from '@bdelab/roar-firekit';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { TaskLauncher } from '../src';
import { firebaseConfig } from './firebaseConfig';
import i18next from 'i18next';
import { stringToBoolean } from '../src/tasks/shared/helpers';
// Import necessary for async in the top level of the experiment script
import 'regenerator-runtime/runtime';

// TODO: Add game params for all tasks
const queryString = new URL(window.location).search;
const urlParams = new URLSearchParams(queryString);
const roarDefaults = stringToBoolean(urlParams.get('roarDefaults'), false);

const taskName = urlParams.get('task') ?? 'egma-math';
const corpus = urlParams.get('corpus');
const buttonLayout = urlParams.get('buttonLayout');
const numOfPracticeTrials = urlParams.get('practiceTrials') === null ? null : parseInt(urlParams.get('practiceTrials'), 10);
const numberOfTrials = urlParams.get('trials') === null ? null : parseInt(urlParams.get('trials'), 10);
const maxIncorrect = urlParams.get('maxIncorrect') === null ? null : parseInt(urlParams.get('maxIncorrect'), 10);
const stimulusBlocks = urlParams.get('blocks') === null ? null : parseInt(urlParams.get('blocks'), 10);
const age = urlParams.get('age') === null ? null : parseInt(urlParams.get('age'), 10);
const maxTime = urlParams.get('maxTime') === null ? null : parseInt(urlParams.get('maxTime'), 10); // time limit for real trials

// const storyCorpus = urlParams.get("storyCopus")

// Boolean parameters
const keyHelpers = stringToBoolean(urlParams.get('keyHelpers'), true);
const skipInstructions = stringToBoolean(urlParams.get('skip'), roarDefaults ? false : true);
const sequentialPractice = stringToBoolean(urlParams.get('sequentialPractice'), true);
const sequentialStimulus = stringToBoolean(urlParams.get('sequentialStimulus'), roarDefaults ? false : true);
const storeItemId = stringToBoolean(urlParams.get('storeItemId'), roarDefaults ? true : false);

const { language } = i18next;
// const story = stringToBoolean(urlParams.get("story"));

// @ts-ignore
const appKit = await initializeFirebaseProject(firebaseConfig, 'assessmentApp', 'none');

onAuthStateChanged(appKit.auth, (user) => {
  if (user) {
    const userInfo = {
      assessmentUid: user.uid,
      userMetadata: {},
    };

    const userParams = {};

    const gameParams = {
      taskName,
      skipInstructions,
      sequentialPractice,
      sequentialStimulus,
      corpus,
      storeItemId,
      buttonLayout,
      numOfPracticeTrials,
      numberOfTrials,
      maxIncorrect,
      stimulusBlocks,
      keyHelpers,
      language,
      age,
      maxTime,
      roarDefaults,
      // story,
      // storyCorpus,
    };

    const taskInfo = {
      taskId: taskName,
      variantParams: gameParams,
    };

    const firekit = new RoarAppkit({
      firebaseProject: appKit,
      taskInfo,
      userInfo,
    });

    const task = new TaskLauncher(firekit, gameParams, userParams);
    task.run();
  }
});

await signInAnonymously(appKit.auth);
