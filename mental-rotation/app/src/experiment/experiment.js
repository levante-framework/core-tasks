import "regenerator-runtime/runtime";
import store from "store2";
import { getStimulusCount, initTrialSaving, initTimeline, } from "./config/config";
// setup
import { jsPsych } from "./jsPsych";
import { preloadTrials, initializeCat } from "./experimentSetup";
// trials
import { stimulus } from "./trials/stimulus";
import { setupPractice, setupStimulus } from "./trials/setupFixation";
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

  // if (config.story) {
  //   createStory();
  // }

  const practiceBlock = {
    timeline: [
      setupPractice,
      stimulus,
      setupPractice,
      stimulus,
    ]
  }

  const stimulusBlock = {
    timeline: [
      setupStimulus,
      stimulus
    ],
    repetitions: store.session.get('config').numberOfTrials
  }

  const timeline = [
    preloadTrials,
    ...initialTimeline.timeline,
    practiceBlock,
    stimulusBlock
  ];

  initializeCat()

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
