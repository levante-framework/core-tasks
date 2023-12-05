import "regenerator-runtime/runtime";
import store from "store2";
// setup
import {
  getPracticeCount,
  getStimulusCount,
  initTrialSaving,
  initTimeline,
  createPreloadTrials,
} from "../shared/helpers";
import { jsPsych, initializeCat } from "../taskSetup";
// trials
import { ifRealTrialResponse, stimulus } from "./trials/stimulus";
import { exitFullscreen } from "../shared/trials";
import { 
  setupPractice, 
  setupStimulus,
} from "../shared/trials";

export default function buildEgmaTimeline(config, mediaAssets) {
  const preloadTrials = createPreloadTrials(mediaAssets).default

  initTrialSaving(config);
  const initialTimeline = initTimeline(config); 

  const timeline = [preloadTrials, ...initialTimeline.timeline];

  const pushSubTaskToTimeline = (
    fixationBlock,
    stimulusCounts,
    trialType,
  ) => {
    // loop through the list of trials per block within the subtest
    for (let i = 0; i < stimulusCounts.length; i++) {
      // add trials to the block (this is the core procedure for each trial)
      let surveyBlock;

      if (trialType === "practice") {
        surveyBlock = {
          timeline: [
            fixationBlock,
            // used to be practice
            stimulus,
            // ifPracticeCorrect,
            // ifPracticeIncorrect,
            ifRealTrialResponse,
          ],
          conditional_function: () => {
            if (stimulusCounts[i] === 0) {
              return false;
            }
            store.session.set("currentBlockIndex", i);
            return true;
          },
          repetitions: stimulusCounts[i],
        };
      } else {
        surveyBlock = {
          timeline: [
            fixationBlock,
            stimulus,
            // ifPracticeCorrect,
            // ifPracticeIncorrect,
            ifRealTrialResponse,
          ],
          conditional_function: () => {
            if (stimulusCounts[i] === 0) {
              return false;
            }
            store.session.set("currentBlockIndex", i);
            return true;
          },
          repetitions: stimulusCounts[i],
        };
      }

      timeline.push(surveyBlock);
    }

  };

  initializeCat();

  pushSubTaskToTimeline(
    setupPractice,
    config.numOfPracticeTrials,
    "practice",
  ); // Practice Trials


  pushSubTaskToTimeline(
    setupStimulus,
    getStimulusCount(),
    "stimulus",
  ); // Stimulus Trials

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}