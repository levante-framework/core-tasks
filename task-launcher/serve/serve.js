import { RoarAppkit, initializeFirebaseProject } from '@bdelab/roar-firekit';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { TaskLauncher } from '../src';
import { firebaseConfig } from './firebaseConfig';
import { stringToBoolean } from '../src/tasks/shared/helpers';
import i18next from 'i18next';
// Import necessary in order to use async/await at the top level
import 'regenerator-runtime/runtime';

// TODO: Add game params for all tasks
const queryString = new URL(window.location).search;
const urlParams = new URLSearchParams(queryString);
const taskName = urlParams.get('task') ?? 'egma-math';
const corpus = urlParams.get('corpus');
const buttonLayout = urlParams.get('buttonLayout');
const numOfPracticeTrials = urlParams.get('practiceTrials');
const numberOfTrials = urlParams.get('trials') === null ? null : parseInt(urlParams.get('trials'), 10);
const maxIncorrect = urlParams.get('maxIncorrect');
const stimulusBlocks = urlParams.get('blocks') === null ? null : parseInt(urlParams.get('blocks'), 10);
const age = urlParams.get('age') === null ? null : parseInt(urlParams.get('age'), 10);
const maxTime = urlParams.get('maxTime') === null ? null : parseInt(urlParams.get('maxTime'), 10); // time limit for real trials
const language = urlParams.get('lng');
const pid = urlParams.get('pid');

// Boolean parameters
const keyHelpers = stringToBoolean(urlParams.get('keyHelpers')); // GK: shouldn't this default to false?
const skipInstructions = stringToBoolean(urlParams.get('skip'), true);
const sequentialPractice = stringToBoolean(urlParams.get('sequentialPractice'), true);
const sequentialStimulus = stringToBoolean(urlParams.get('sequentialStimulus'), true);
const storeItemId = stringToBoolean(urlParams.get('storeItemId'), false);

async function startWebApp() {
  // @ts-ignore
  const appKit = await initializeFirebaseProject(firebaseConfig, 'assessmentApp', 'none');

  onAuthStateChanged(appKit.auth, (user) => {
    if (user) {
      const userInfo = {
        assessmentUid: user.uid,
        userMetadata: {},
      };

      const userParams = {
        pid,
      };

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
}

await startWebApp();
