import { RoarAppkit, initializeFirebaseProject } from "@bdelab/roar-firekit";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { TaskLauncher } from "../src";
import { firebaseConfig } from "./firebaseConfig";
import i18next from "i18next";
import { stringToBoolean } from "../src/tasks/shared/helpers";
// Import necessary for async in the top level of the experiment script
import "regenerator-runtime/runtime";


// TODO: Add game params for all tasks
const queryString = new URL(window.location).search;
const urlParams = new URLSearchParams(queryString);
const taskName = urlParams.get("taskName") ?? 'egma-math'
const corpus = urlParams.get("corpus");
// const storyCorpus = urlParams.get("storyCopus")
const buttonLayout = urlParams.get("buttonLayout");
const numOfPracticeTrials = urlParams.get("practiceTrials");
const numberOfTrials = urlParams.get("trials") === null ? null : parseInt(urlParams.get("trials"), 10);
const stimulusBlocks = urlParams.get("blocks") === null ? null : parseInt(urlParams.get("blocks"), 10);
// Boolean parameters
const keyHelpers = stringToBoolean(urlParams.get('keyHelpers'), true)
// const story = stringToBoolean(urlParams.get("story"));
const skipInstructions = stringToBoolean(urlParams.get("skip"), true)
const sequentialPractice = stringToBoolean(urlParams.get("sequentialPractice"), true)
const sequentialStimulus = stringToBoolean(urlParams.get("sequentialStimulus"), true)
const { language } = i18next;


// @ts-ignore
const appKit = await initializeFirebaseProject(
  firebaseConfig,
  "assessmentApp",
  "none",
);


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
      buttonLayout,
      numOfPracticeTrials,
      numberOfTrials,
      // story,
      // storyCorpus,
      stimulusBlocks,
      keyHelpers,
      language
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
