import "regenerator-runtime/runtime";
import { initTimeline, initTrialSaving } from "../shared/helpers";

// setup
import { jsPsych } from "../taskSetup";
import { initializeCat } from "../taskSetup";
import { createPreloadTrials } from "../shared/helpers";

// trials
import { exitFullscreen } from "../shared/trials";
import { corsiBlocksDisplay, corsiBlocks, } from "./trials/stimulus";

export default function buildMemoryTimeline(config, mediaAssets) {
  initTrialSaving(config);
  const initialTimeline = initTimeline(config);

  const timeline = [
    // preloadTrials, 
    ...initialTimeline.timeline,
    corsiBlocksDisplay,
    corsiBlocks,
    // corsiBlocksDisplay,
    // corsiBlocks,
  ];


  initializeCat();
  
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}