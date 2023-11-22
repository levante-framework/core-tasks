import "regenerator-runtime/runtime";
import store from "store2";
import { getStimulusCount, initTrialSaving, initTimeline, } from "./config/config";
// setup
import { jsPsych } from "./jsPsych";
import { preloadTrials, initializeCat } from "./experimentSetup";
// trials
import { stimulusPhase1, stimulusPhase2 } from "./trials/stimulus";
import { setupMainTrial, setupPracticeTrial } from "./trials/setupFixation";
import { exitFullscreen } from "./trials/fullScreen";
import { subTaskInitStimulus, subTaskInitPractice, } from "./trials/subTask";
import { practiceFeedback } from "./trials/practiceFeedback";
import { audioFeedback } from "./trials/audioFeedback";
import {
  endTrial,
  storyBreakList,
  introAndInstructions,
  practiceDone,
  createStory,
} from "./trials/instructions";

export function buildExperiment(config) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);


  const timeline = [
    preloadTrials,
    // ...initialTimeline.timeline
    stimulusPhase1,
    stimulusPhase2
  ];

  
  initializeCat();
  

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
