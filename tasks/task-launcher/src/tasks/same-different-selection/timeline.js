import "regenerator-runtime/runtime";
import store from "store2";
import { initTrialSaving, initTimeline } from "../shared/helpers";

// setup
import { jsPsych } from "../taskSetup";
import { createPreloadTrials } from "../shared/helpers";
import { initializeCat } from "../taskSetup";

// trials
import { stimulus } from "./trials/stimulus";
import { setupPractice, setupStimulus, exitFullscreen } from "../shared/trials";

export default function buildSameDifferentTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets);
  
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);


  const practiceBlock = {
    timeline: [
      setupPractice,
      stimulus
    ],
    repetitions: store.session.get('config').numOfPracticeTrials
  }

  const stimulusBlock = {
    timeline: [
      setupStimulus,
      stimulus
    ],
    repetitions: store.session.get('maxStimulusTrials')
  }


  const timeline = [
    preloadTrials,
    // ...initialTimeline.timeline
    practiceBlock,
    stimulusBlock
  ];

  
  initializeCat();
  

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}