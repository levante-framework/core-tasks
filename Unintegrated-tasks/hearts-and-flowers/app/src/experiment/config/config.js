import store from 'store2';
import _omitBy from 'lodash/omitBy';
import _isNull from 'lodash/isNull';
import _isUndefined from 'lodash/isUndefined';
import { getAgeData } from '@bdelab/roar-utils';
import i18next from 'i18next';
import { getUserDataTimeline } from '../trials/getUserData';
import { enterFullscreen } from '../trials/fullScreen';
import { corpusAll, corpusNew, corpusOriginal } from './corpus';
import { RoarScores } from '../scores';
import { jsPsych } from '../jsPsych';
import { shuffle } from '../helperFunctions';

const makePid = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 16; i += 1) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

const initStore = (config) => {
  if (store.session.has('initialized') && store.local('initialized')) {
    return store.session;
  }
  if (
    config.userMode === 'fullAdaptive' ||
    config.userMode === 'testAdaptive' ||
    config.userMode === 'shortAdaptive' ||
    config.userMode === 'longAdaptive'
  ) {
    store.session.set('itemSelect', 'mfi');
  } else {
    store.session.set('itemSelect', 'random');
  }
  store.session.set('practiceIndex', 0);
  // Counting variables
  store.session.set('currentBlockIndex', 0);
  store.session.set('trialNumBlock', 1); // counter for trials in block
  store.session.set('trialNumTotal', 1); // counter for trials in experiment
  store.session.set('demoCounter', 0);
  store.session.set('nextStimulus', null);
  store.session.set('response', '');

  // variables to track current state of the experiment
  store.session.set('currentTrialCorrect', true); // return true or false
  store.session.set('coinTrackingIndex', 0);

  store.session.set('initialized', true);

  store.session.set('corpusAll', corpusAll);
  store.session.set('corpusOriginal', corpusOriginal);
  store.session.set('corpusNew', corpusNew);

  return store.session;
};

export const setRandomUserMode = (mode) => {
  if (mode === 'test') {
    return Math.random() < 0.5 ? 'testAdaptive' : 'testRandom';
  }
  if (mode === 'full') {
    return Math.random() < 0.5 ? 'fullAdaptive' : 'fullRandom';
  }
  return mode;
};

const stimulusRuleLists = {
  fullRandom: ['random', 'random', 'random'],
  fullAdaptive: ['adaptive', 'adaptive', 'adaptive'],
  shortAdaptive: ['adaptive', 'adaptive', 'adaptive'],
  longAdaptive: ['adaptive', 'adaptive', 'adaptive'],
  fullItemBank: ['random', 'random', 'random'],
  demo: ['demo'],
  testAdaptive: ['adaptive', 'adaptive', 'adaptive'],
  testRandom: ['adaptive', 'adaptive', 'adaptive'],
};

// Stimulus timing options in milliseconds
const stimulusTimeOptions = [null, 350, 1000, 2000];
// Fixation presentation time options in milliseconds
const fixationTimeOptions = [1000, 2000, 25000];
// Trial completion time options in milliseconds
const trialTimeOptions = [null, 5000, 8000, 100000];

// eslint-disable-next-line max-len
const divideTrial2Block = (n1, n2, nBlock) => {
  const n = parseInt(n1, 10) + parseInt(n2, 10);
  return [Math.floor(n / nBlock), Math.floor(n / nBlock), n - 2 * Math.floor(n / nBlock)];
};

const getAudioFeedbackConfig = (audioFeedbackOption) => {
  // this function will let randomAudioFeedback control audioFeedback
  if (audioFeedbackOption === 'random') {
    return Math.random() < 0.5 ? 'neutral' : 'binary';
  }
  if (audioFeedbackOption === 'neutral') {
    return 'neutral';
  }
  return 'binary';
};

export const getStimulusCount = (userMode, numAdaptive, numNew, numValidated) => {
  const stimulusCountMap = {
    fullAdaptive: [82, 82, 81],
    fullRandom: [57, 57, 56],
    shortAdaptive: divideTrial2Block(numAdaptive, numNew, 3),
    longAdaptive: divideTrial2Block(numAdaptive, numNew, 3),
    fullItemBank: divideTrial2Block(numValidated, numNew, 3),
    demo: [60],
    testAdaptive: [6, 4, 4],
    testRandom: [6, 4, 4],
  };

  return stimulusCountMap[userMode];
};

export const adjustNumNewItems = (userMode) => {
  if (userMode === 'shortAdaptive') return 15;
  if (userMode === 'fullItemBank') return 40;
  return 25;
};

export const initConfig = async (firekit, gameParams, userParams, displayElement) => {
  const cleanParams = _omitBy(_omitBy({ ...gameParams, ...userParams }, _isNull), _isUndefined);

  const {
    userMode = 'shortAdaptive',
    assessmentPid,
    labId,
    recruitment,
    story,
    userMetadata = {},
    consent,
    audioFeedbackOption,
    language = i18next.language,
    numAdaptive = userMode === 'shortAdaptive' ? 85 : 150,
    numNew = adjustNumNewItems(userMode),
    numValidated = userMode === 'fullItemBank' ? 246 : 100,
    skipInstructions,
    addNoResponse,
    birthMonth,
    birthYear,
    age,
    ageMonths,
  } = cleanParams;

  const ageData = getAgeData(birthMonth, birthYear, age, ageMonths);

  if (language !== 'en') i18next.changeLanguage(language);

  const config = {
    userMode,
    pid: assessmentPid,
    labId,
    recruitment: recruitment || 'pilot',
    userMetadata: { ...userMetadata, ...ageData },
    audioFeedbackOption,
    audioFeedback: getAudioFeedbackConfig(audioFeedbackOption),
    story: story ?? true,
    consent: consent ?? true,
    skipInstructions: skipInstructions ?? true,
    numAdaptive,
    numNew,
    numValidated,
    adaptive2new: Math.floor(numAdaptive / numNew),
    stimulusRuleList: stimulusRuleLists[userMode],
    stimulusCountList: getStimulusCount(userMode, numAdaptive, numNew, numValidated),
    totalTrialsPractice: 5,
    countSlowPractice: 2,
    nRandom: 5,
    indexArray: shuffle(
      Array(parseInt(numNew, 10))
        .fill(0)
        .concat(Array(parseInt(numValidated, 10)).fill(1)),
    ),
    timing: {
      stimulusTimePracticeOnly: stimulusTimeOptions[0], // null as default for practice trial only
      stimulusTime: stimulusTimeOptions[1],
      fixationTime: fixationTimeOptions[0],
      trialTimePracticeOnly: trialTimeOptions[0],
      trialTime: trialTimeOptions[0],
    },
    startTime: new Date(),
    firekit,
    addNoResponse: addNoResponse ?? false,
    displayElement: displayElement || null,
  };

  const updatedGameParams = Object.fromEntries(
    Object.entries(gameParams).map(([key, value]) => [key, config[key] ?? value]),
  );

  await config.firekit.updateTaskParams(updatedGameParams);

  if (config.pid) {
    await config.firekit.updateUser({ assessmentPid: config.pid, ...userMetadata });
  }

  return config;
};

export const initRoarJsPsych = (config) => {
  if (config.displayElement) {
    jsPsych.opts.display_element = config.displayElement;
  }

  // Extend jsPsych's on_finish and on_data_update lifecycle functions to mark the
  // run as completed and write data to Firestore, respectively.
  const extend = (fn, code) =>
    function () {
      // eslint-disable-next-line prefer-rest-params
      fn.apply(fn, arguments);
      // eslint-disable-next-line prefer-rest-params
      code.apply(fn, arguments);
    };

  jsPsych.opts.on_finish = extend(jsPsych.opts.on_finish, () => {
    config.firekit.finishRun();
  });

  const roarScores = new RoarScores();
  jsPsych.opts.on_data_update = extend(jsPsych.opts.on_data_update, (data) => {
    if (data.save_trial) {
      config.firekit.writeTrial(data, roarScores.computedScoreCallback.bind(roarScores));
    }
  });

  // Add a special error handler that writes javascript errors to a special trial
  // type in the Firestore database
  window.addEventListener('error', (e) => {
    const { msg, url, lineNo, columnNo, error } = e;

    config.firekit?.writeTrial({
      assessment_stage: 'error',
      lastTrial: jsPsych.data.getLastTrialData().trials[0],
      message: String(msg),
      source: url || null,
      lineNo: String(lineNo || null),
      colNo: String(columnNo || null),
      error: JSON.stringify(error || null),
      timeStamp: new Date().toISOString(),
    });
  });

  initStore(config);
};

export const initRoarTimeline = (config) => {
  // If the participant's ID was **not** supplied through the query string, then
  // ask the user to fill out a form with their ID, class and school.

  const initialTimeline = [enterFullscreen, ...getUserDataTimeline];

  const beginningTimeline = {
    timeline: initialTimeline,
    on_timeline_finish: async () => {
      // eslint-disable-next-line no-param-reassign
      config.pid = config.pid || makePid();
      await config.firekit.updateUser({
        assessmentPid: config.pid,
        labId: config.labId,
        ...config.userMetadata,
      });
    },
  };

  return beginningTimeline;
};
