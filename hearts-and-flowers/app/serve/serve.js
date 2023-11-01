import { RoarAppkit, initializeFirebaseProject } from '@bdelab/roar-firekit';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import i18next from 'i18next';
// Import necessary for async in the top level of the experiment script
import 'regenerator-runtime/runtime';

import RoarSWR from '../src/index';
import { roarConfig } from './firebaseConfig';
import { initSentry } from '../src/sentry';

initSentry();

const queryString = new URL(window.location).search;
const urlParams = new URLSearchParams(queryString);
const userMode = urlParams.get('mode');
const recruitment = urlParams.get('recruitment');
const assessmentPid = urlParams.get('PROLIFIC_PID') || urlParams.get('participant');
const audioFeedbackOption = urlParams.get('audioFeedbackOption'); // "random", "neutral", "binary", or null
const numAdaptive = urlParams.get('numAdaptive') === null ? null : parseInt(urlParams.get('numAdaptive'), 10);
const numNew = urlParams.get('numNew') === null ? null : parseInt(urlParams.get('numNew'), 10);
const numValidated = urlParams.get('numValidated') === null ? null : parseInt(urlParams.get('numValidated'), 10);
export const labId = urlParams.get('labId');
const birthYear = urlParams.get('birthyear');
const birthMonth = urlParams.get('birthmonth');
const age = urlParams.get('age');
const ageMonths = urlParams.get('agemonths');
// Boolean parameters
const consent = urlParams.get('consent')?.toLocaleLowerCase() !== 'false';
const story = urlParams.get('story')?.toLocaleLowerCase() !== 'false';
const skipInstructions = urlParams.get('skip')?.toLocaleLowerCase() !== 'true';
const addNoResponse = urlParams.get('addNoResponse')?.toLocaleLowerCase() === 'true';
const { language } = i18next;

// @ts-ignore
const appKit = await initializeFirebaseProject(roarConfig.firebaseConfig, 'assessmentApp', 'none');

const taskId = language === 'en' ? 'swr' : `swr-${language}`;

onAuthStateChanged(appKit.auth, (user) => {
  if (user) {
    const userInfo = {
      assessmentPid,
      assessmentUid: user.uid,
      userMetadata: {
        districtId: '',
        language,
      },
    };

    const userParams = {
      assessmentPid,
      labId,
      birthMonth,
      birthYear,
      age,
      ageMonths,
    };

    const gameParams = {
      userMode,
      recruitment,
      skipInstructions,
      consent,
      audioFeedbackOption,
      numAdaptive,
      numNew,
      numValidated,
      addNoResponse,
      story,
    };

    const taskInfo = {
      taskId: taskId,
      variantParams: gameParams,
    };

    const firekit = new RoarAppkit({
      firebaseProject: appKit,
      taskInfo,
      userInfo,
    });

    const roarApp = new RoarSWR(firekit, gameParams, userParams);

    roarApp.run();
  }
});

await signInAnonymously(appKit.auth);
