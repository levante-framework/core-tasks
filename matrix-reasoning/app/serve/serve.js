import { RoarAppkit, initializeFirebaseProject } from "@bdelab/roar-firekit";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import MultichoiceTask from "../src/experiment/index";
import { firebaseConfig } from "./firebaseConfig";
import i18next from "i18next";
import { stringToBoolean } from "../src/experiment/helperFunctions";
// Import necessary for async in the top level of the experiment script
import "regenerator-runtime/runtime";

const queryString = new URL(window.location).search;
const urlParams = new URLSearchParams(queryString);
const taskName = urlParams.get("taskName") ?? 'egma-math'
const practiceCorpus = urlParams.get("practiceCorpus");
const stimulusCorpus = urlParams.get("stimulusCorpus");
const storyCorpus = urlParams.get("storyCopus")
const buttonLayout = urlParams.get("buttonLayout");
const numOfPracticeTrials = urlParams.get("practiceTrials");
const numberOfTrials = urlParams.get("trials") === null ? null : parseInt(urlParams.get("trials"), 10);
const stimulusBlocks = urlParams.get("blocks") === null ? null : parseInt(urlParams.get("blocks"), 10);
// Boolean parameters
const keyHelpers = stringToBoolean(urlParams.get('keyHelpers'), true)
const story = stringToBoolean(urlParams.get("story"));
const skipInstructions = stringToBoolean(urlParams.get("skip"), true)
const sequentialPractice = stringToBoolean(urlParams.get("sequentialPractice"), true)
const sequentialStimulus = stringToBoolean(urlParams.get("sequentialStimulus"), true)
const { language } = i18next;

import { generateAssetObject } from "../src/experiment/helperFunctions";

// @ts-ignore
const appKit = await initializeFirebaseProject(
  firebaseConfig,
  "assessmentApp",
  "none",
);

const taskId = language === "en" ? taskName : `${taskName}-${language}`;

const assetObj = await generateAssetObject('https://storage.googleapis.com', 'matrix-reasoning')

console.log({assetObj})

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
      practiceCorpus,
      stimulusCorpus,
      sequentialPractice,
      sequentialStimulus,
      buttonLayout,
      numOfPracticeTrials,
      numberOfTrials,
      story,
      storyCorpus,
      stimulusBlocks,
      keyHelpers
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

    const app = new MultichoiceTask(firekit, gameParams, userParams);
    app.run();
  }
});

await signInAnonymously(appKit.auth);
