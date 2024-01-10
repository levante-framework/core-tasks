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
import { afcStimulus } from "../shared/trials/afcStimulus";
import { exitFullscreen, setupPractice, setupStimulus } from "../shared/trials";


export default function buildTROGTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default

  initTrialSaving(config);
  const initialTimeline = initTimeline(config); 

  const practiceBlock = {
    timeline: [
      setupPractice,
      // does it matter if trial has properties that don't belong to that type?
      afcStimulus({
        trialType: 'html',
        responseAllowed: true,
        promptAboveButtons: true,
        task: config.task
      })
    ],
    repetitions: config.numOfPracticeTrials
  }

  const stimulusBlock = {
    timeline: [
      setupStimulus,
      afcStimulus()
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