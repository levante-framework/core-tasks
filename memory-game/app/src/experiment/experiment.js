import "regenerator-runtime/runtime";
import store from "store2";
import {
  getStimulusCount,
  initTrialSaving,
  initTimeline,
} from "./config/config";

// setup
import { jsPsych } from "./jsPsych";
import { preloadTrials, initializeCat } from "./experimentSetup";
// trials
import {
  ifRealTrialResponse,
  practiceTrials,
  stimulusTrials,
} from "./trials/stimulus";
import { setupMainTrial, setupPracticeTrial } from "./trials/setup";
import { exitFullscreen } from "./trials/fullScreen";
import { subTaskInitStimulus, subTaskInitPractice, } from "./trials/subTask";
import { ifPracticeCorrect, ifPracticeIncorrect } from "./trials/practice";
import {
  endTrial,
  storyBreakList,
  introAndInstructions,
  practiceDone,
  createStory,
} from "./trials/storySetup";
import { corsiBlocksDisplay, corsiBlocks, } from "./trials/corsiBlocks";

export function buildExperiment(config) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  if (config.story) {
    createStory();
  }

  const timeline = [
    // preloadTrials, 
    // ...initialTimeline.timeline,
    corsiBlocksDisplay,
    corsiBlocks,
    corsiBlocksDisplay,
    corsiBlocks,
  ];

  

  initializeCat();
  
  // story intro
  if (config.story) timeline.push(introAndInstructions);

  
  if (config.story) timeline.push(practiceDone);


  if (config.story) timeline.push(endTrial); // End Task
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
