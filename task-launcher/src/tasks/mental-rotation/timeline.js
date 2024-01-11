import "regenerator-runtime/runtime";
import store from "store2";
import { initTrialSaving, initTimeline } from "../shared/helpers";
// setup
import { jsPsych } from "../taskSetup";
import { initializeCat } from "../taskSetup";
import { createPreloadTrials } from "../shared/helpers";
// trials
import { stimulus } from "./trials/stimulus";
import { setupPractice, setupStimulus } from "../shared/trials";
import { exitFullscreen } from "../shared/trials";

export default function buildMentalRotationTimline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default

  initTrialSaving(config);
  const initialTimeline = initTimeline(config); 

  const practiceBlock = {
    timeline: [
      setupPractice,
      stimulus,
    ],
    repetitions: config.numOfPracticeTrials
  }

  const stimulusBlock = {
    timeline: [
      setupStimulus,
      stimulus
    ],
    repetitions: store.session.get('maxStimulusTrials'),
  }

  const timeline = [
    preloadTrials,
    ...initialTimeline.timeline,
    // practiceBlock,
    stimulusBlock
  ];

  initializeCat()

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}