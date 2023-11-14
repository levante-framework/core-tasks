import { RoarAppkit, initializeFirebaseProject } from "@bdelab/roar-firekit";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import RoarMultichoice from "../src/experiment/index";
import { roarConfig } from "./firebaseConfig";
import i18next from "i18next";

// Import necessary for async in the top level of the experiment script
import "regenerator-runtime/runtime";

const queryString = new URL(window.location).search;
const urlParams = new URLSearchParams(queryString);
const taskName = urlParams.get("task") ?? "egma-math";
const assessmentPid = urlParams.get("PROLIFIC_PID") || urlParams.get("participant");
const practiceCorpus = urlParams.get("practiceCorpus");
const stimulusCorpus = urlParams.get("stimulusCorpus");
const buttonLayout = urlParams.get("buttonLayout");
const numberOfTrials = urlParams.get("trials") === null ? null : parseInt(urlParams.get("trials"), 10);

// Boolean parameters
const skipInstructions = urlParams.get("skip")?.toLocaleLowerCase() !== "true";
const sequentialPractice = urlParams.get("sequentialPractice")?.toLocaleLowerCase() !== "false";
const sequentialStimulus = urlParams.get("sequentialStimulus")?.toLocaleLowerCase() === "true";
const { language } = i18next;

// @ts-ignore
const appKit = await initializeFirebaseProject(
  roarConfig.firebaseConfig,
  "assessmentApp",
  "none",
);

const taskId = language === "en" ? taskName : `${taskName}-${language}`;

onAuthStateChanged(appKit.auth, (user) => {
  if (user) {
    const userInfo = {
      assessmentPid,
      assessmentUid: user.uid,
      userMetadata: {
        districtId: "",
      },
    };

    const userParams = {
      assessmentPid,
    };

    const gameParams = {
      taskName,
      skipInstructions,
      practiceCorpus,
      stimulusCorpus,
      sequentialPractice,
      sequentialStimulus,
      buttonLayout,
      numberOfTrials,
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

    const roarApp = new RoarMultichoice(firekit, gameParams, userParams);
    roarApp.run();
  }
});

await signInAnonymously(appKit.auth);
