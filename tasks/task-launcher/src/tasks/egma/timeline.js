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
import { slider } from "./trials/sliderStimulus";
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

  const stimulusBlock = {
    timeline: [stimulus],
    conditional_function: () => {
      return !store.session.get('nextStimulus').task.includes('Number Line')
    }
  }

  const sliderBlock = {
    timeline: [slider],
    conditional_function: () => {
      return store.session.get('nextStimulus').task.includes('Number Line')
    }
  }

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
            stimulusBlock,
            sliderBlock,
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
            stimulusBlock,
            sliderBlock,
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