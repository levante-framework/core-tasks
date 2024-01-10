import "regenerator-runtime/runtime";
// setup
import store from "store2";
import {
  initTrialSaving,
  initTimeline,
  createPreloadTrials,
} from "../shared/helpers";
import { jsPsych, initializeCat } from "../taskSetup";
// trials
import { stimulus } from "./trials/stimulus";
import { exitFullscreen, setupPractice, setupStimulus } from "../shared/trials";


export default function buildMatrixTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default

  initTrialSaving(config);
  const initialTimeline = initTimeline(config); 

  const practiceBlock = {
    timeline: [
      setupPractice,
      stimulus
    ],
    repetitions: config.numOfPracticeTrials
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
    ...initialTimeline.timeline,
    practiceBlock,
    stimulusBlock,
  ];

  initializeCat();
  
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}