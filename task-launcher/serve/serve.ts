import { RoarAppkit, initializeFirebaseProject } from '@bdelab/roar-firekit';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { TaskLauncher } from '../src';
import  { firebaseConfig } from './firebaseConfig';
import { stringToBoolean } from '../src/tasks/shared/helpers';
import i18next from 'i18next';
// Import necessary in order to use async/await at the top level
import 'regenerator-runtime/runtime';
import * as Sentry from "@sentry/browser";

const parseIntUrlParams = (value: string | null) => {
  if (value === null) {
    return null;
  }
  return parseInt(value, 10);
};

/**
 * Initialize Sentry first!
 */
Sentry.init({
  dsn: "https://9d67b24a405feffb49477ca8002cc033@o4507250485035008.ingest.us.sentry.io/4507376476618752",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled

  // TODO spyne Remove this. For testing sentry. Use this to enable localhost monitoring
  // tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  tracePropagationTargets: ["https://hs-levante-assessment-dev.web.app"],

  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});


// TODO: Add game params for all tasks
const queryString = new URL(window.location.href).search;
const urlParams = new URLSearchParams(queryString);
const taskName = urlParams.get('task') ?? 'egma-math';
const corpus = urlParams.get('corpus');
const buttonLayout = urlParams.get('buttonLayout');
const numOfPracticeTrials = urlParams.get('practiceTrials');
const numberOfTrials = parseIntUrlParams(urlParams.get('trials'));
const maxIncorrect = urlParams.get('maxIncorrect');
const stimulusBlocks = parseIntUrlParams(urlParams.get('blocks'));
const age = parseIntUrlParams(urlParams.get('age'));
const maxTime = parseIntUrlParams(urlParams.get('maxTime')); // time limit for real trials
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

      const task = new TaskLauncher(firekit, gameParams, userParams, false);
      task.run();
    }
  });

  await signInAnonymously(appKit.auth);
}

startWebApp();