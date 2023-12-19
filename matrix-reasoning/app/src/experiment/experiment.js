import "regenerator-runtime/runtime";
import { getStimulusCount, initTrialSaving, initTimeline, } from "./config/config";
// setup
import { jsPsych } from "./jsPsych";
import { preloadTrials, initializeCat, mediaAssets } from "./experimentSetup";
// trials
import { stimulus } from "./trials/stimulus";
import { setupMainTrial, setupPracticeTrial } from "./trials/setupFixation";
import { exitFullscreen } from "./trials/fullScreen";
import { endTrial, createStory, } from "./trials/instructions";


export function buildExperiment(config) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  if (config.story) {
    createStory();
  }

  const practiceBlock = {
    timeline: [
      setupPracticeTrial,
      stimulus
    ],
    repetitions: 3
  }

  const timeline = [
    preloadTrials,
    practiceBlock,
    ...initialTimeline.timeline
  ];

  initializeCat();
  

  if (config.story) timeline.push(endTrial); // End Task
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
