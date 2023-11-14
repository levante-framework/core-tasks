import store from "store2";
import _omitBy from "lodash/omitBy";
import _isNull from "lodash/isNull";
import _isUndefined from "lodash/isUndefined";
import i18next from "i18next";
import { enterFullscreen } from "../trials/fullScreen";
import { corpora } from "./corpus";
import { jsPsych } from "../jsPsych";

const makePid = () => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i += 1)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

const initStore = (config) => {
  if (store.session.has("initialized") && store.local("initialized")) {
    return store.session;
  }

  if (
    // future adaptive modes
    config.userMode === "fullAdaptive" ||
    config.userMode === "shortAdaptive" ||
    config.task !== "cva"
  ) {
    // use adaptive algorithm to select next item
    store.session.set("itemSelect", "mfi");
  } else {
    store.session.set("itemSelect", "random");
  }

  // Counting variables
  store.session.set("practiceIndex", 0);
  store.session.set("currentBlockIndex", 0); // counter for breaks within subtask
  store.session.set("subTaskName", ""); // init to "" so getNextSubTask will work

  store.session.set("trialNumSubtask", 0); // counter for trials in subtask
  store.session.set("trialNumTotal", 0); // counter for trials in experiment

  // variables related to stimulus and response
  store.session.set("nextStimulus", null);
  store.session.set("response", "");

  // variables to track current state of the experiment
  store.session.set("currentTrialCorrect", true); // return true or false
  store.session.set("coinTrackingIndex", 0);

  // running computations
  store.session.set("subtaskCorrect", 0);
  store.session.set("totalCorrect", 0);
  store.session.set("correctItems", []);
  store.session.set("incorrectItems", []);

  // working copy of the three corpuses (items are removed as they are used)
  store.session.set("corpora", corpora);

  // this should be the last set before return
  store.session.set("initialized", true);

  return store.session;
};

// Stimulus timing options in milliseconds
const stimulusTimeOptions = [null, 350, 1000, 2000];
// Fixation presentation time options in milliseconds
const fixationTimeOptions = [1000, 2000, 25000];
// Trial completion time options in milliseconds
const trialTimeOptions = [null, 5000, 8000, 100000];

// get size of pratice blocks
export const getPracticeCount = (practiceType) => {
  const stimulusCountMap = {
    // this table is indexed by practiceType and returns a list with the number of trials in each block
    // userMode: [block1, block2, ...blockN]
    practice: [3],
    stimulus: [5, 5, 5],
  };

  return stimulusCountMap[practiceType];
};

// This is based on stimulusCountMap. It does not need to be 3.
function divideByThree(num) {
  // Minimum number of trials, also random. Can change to whatever.
  if (num < 9) num = 9;
  const baseFraction = Math.floor(num / 3);
  const remainder = num % 3;

  // Create an array filled with the base fraction
  const fractions = [baseFraction, baseFraction, baseFraction];

  // Distribute the remainder among the first few fractions
  for (let i = 0; i < remainder; i++) {
    fractions[i]++;
  }

  return fractions;
}

// get size of blocks
export const getStimulusCount = (userMode) => {
  const numberOfTrials = store.session.get("config").numberOfTrials;
  const maxNumberOfTrials = store.session.get("maxStimulusTrials");

  let countList;

  if (numberOfTrials) {
    if (numberOfTrials > maxNumberOfTrials) {
      countList = divideByThree(maxNumberOfTrials);
    } else {
      countList = divideByThree(numberOfTrials);
    }

    store.session.set("stimulusCountList", countList);
    return countList;
  }

  const stimulusCountMap = {
    // this table is indexed by userMode and returns a list with the number of trials in each block
    // userMode: [block1, block2, ...blockN]
    fullAdaptive: [7, 7, 6],
    fullRandom: [17, 17, 17],
    testRandom: [7, 7, 6],
    demo: [3, 3, 3], // 9 letters with 2 breaks
  };
  store.session.set("stimulusCountList", [10, 10, 10]);
  return [10, 10, 10];
};

export const initConfig = async (
  firekit,
  gameParams,
  userParams,
  displayElement,
) => {
  const cleanParams = _omitBy(
    _omitBy({ ...gameParams, ...userParams }, _isNull),
    _isUndefined,
  );

  const {
    // Setting default userMode to fullAdaptive, which uses mfi item selection rather than random
    // userMode,
    assessmentPid,
    userMetadata = {},
    audioFeedback,
    language = i18next.language,
    skipInstructions,
    practiceCorpus,
    stimulusCorpus,
    sequentialPractice,
    sequentialStimulus,
    buttonLayout,
    numberOfTrials,
    taskName = "egma-math",
  } = cleanParams;

  language !== "en" && i18next.changeLanguage(language);

  const config = {
    // userMode: userMode ?? "fullRandom",
    pid: assessmentPid,
    userMetadata: { ...userMetadata, },
    audioFeedback: audioFeedback || "neutral",
    skipInstructions: skipInstructions ?? true,
    timing: {
      stimulusTimePracticeOnly: stimulusTimeOptions[0], // null as default for practice trial only
      stimulusTime: stimulusTimeOptions[1],
      fixationTime: fixationTimeOptions[0],
      trialTimePracticeOnly: trialTimeOptions[0],
      trialTime: trialTimeOptions[0],
    },
    startTime: new Date(),
    firekit,
    displayElement: displayElement || null,
    // name of the csv files in the bucket
    practiceCorpus: practiceCorpus ?? "math-item-bank-practice-pz",
    stimulusCorpus: stimulusCorpus ?? "math-item-bank-pz",
    sequentialPractice: sequentialPractice ?? true,
    sequentialStimulus: sequentialStimulus ?? true,
    buttonLayout: buttonLayout || "default",
    numberOfTrials,
    task: taskName ?? "egma-math",
  };

  const updatedGameParams = Object.fromEntries(
    Object.entries(gameParams).map(([key, value]) => [
      key,
      config[key] ?? value,
    ]),
  );

  await config.firekit.updateTaskParams(updatedGameParams);

  if (config.pid !== null) {
    await config.firekit.updateUser({
      assessmentPid: config.pid,
      ...userMetadata,
    });
  }

  return config;
};

export const initRoarJsPsych = (config) => {
  if (config.displayElement) {
    jsPsych.opts.display_element = config.display_element;
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

  jsPsych.opts.on_data_update = extend(jsPsych.opts.on_data_update, (data) => {
    if (data.save_trial) {
      config.firekit.writeTrial(
        data,
      );
    }
  });

  // Add a special error handler that writes javascript errors to a special trial
  // type in the Firestore database
  window.addEventListener("error", (e) => {
    const { msg, url, lineNo, columnNo, error } = e;

    config.firekit?.writeTrial({
      task: "error",
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

  const initialTimeline = [enterFullscreen, ];

  const beginningTimeline = {
    timeline: initialTimeline,
    on_timeline_finish: async () => {
      // eslint-disable-next-line no-param-reassign
      config.pid = config.pid || makePid();
      await config.firekit.updateUser({
        assessmentPid: config.pid,
        ...config.userMetadata,
      });
    },
  };

  return beginningTimeline;
};
