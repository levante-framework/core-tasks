import { RoarAppkit, initializeFirebaseProject } from '@levante-framework/firekit';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import * as Sentry from '@sentry/browser';
import i18next from 'i18next';
import { TaskLauncher } from '../src';
import { firebaseConfig } from './firebaseConfig';
import { stringToBoolean } from '../src/tasks/shared/helpers/stringToBoolean';
import firebaseJSON from '../firebase.json';

// Import necessary in order to use async/await at the top level
import 'regenerator-runtime/runtime';

/**
 * Initialize Sentry first!
 */
Sentry.init({
  dsn: 'https://9d67b24a405feffb49477ca8002cc033@o4507250485035008.ingest.us.sentry.io/4507376476618752',
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled

  // TODO spyne Remove this. For testing sentry. Use this to enable localhost monitoring
  // tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  tracePropagationTargets: ['https://hs-levante-admin-dev.web.app'],

  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

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
const semThreshold = Number(urlParams.get('semThreshold') || '0');
const startingTheta = Number(urlParams.get('theta') || '0');

// Boolean parameters
const keyHelpers = stringToBoolean(urlParams.get('keyHelpers'));
const skipInstructions = stringToBoolean(urlParams.get('skip'), true);
const sequentialPractice = stringToBoolean(urlParams.get('sequentialPractice'), true);
const sequentialStimulus = stringToBoolean(urlParams.get('sequentialStimulus'), true);
const storeItemId = stringToBoolean(urlParams.get('storeItemId'), false);
const cat = stringToBoolean(urlParams.get('cat'), false);
const heavyInstructions = stringToBoolean(urlParams.get('heavyInstructions'), false);

const emulatorConfig = EMULATORS ? firebaseJSON.emulators : undefined;

async function startWebApp() {
  const appKit = await initializeFirebaseProject(firebaseConfig, 'admin', emulatorConfig, 'none');

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
        cat,
        inferenceNumStories,
        semThreshold,
        startingTheta,
        heavyInstructions,
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
