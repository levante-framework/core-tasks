// import "regenerator-runtime/runtime";
import store from "store2";
import {
  getPracticeCount,
  getStimulusCount,
  initRoarJsPsych,
  initRoarTimeline,
} from "./config/config";

// setup
import { jsPsych } from "../taskSetup";
import { preloadTrials, initializeCat } from "./taskSetup";
// trials
import { ifRealTrialResponse, stimulusTrial } from "./trials/stimulus";
import { exitFullscreen } from "../shared/trials";
import { 
  ifPracticeCorrect,
  ifPracticeIncorrect, 
  setupPractice, 
  setupStimulus,
} from "../shared/trials";

export function buildEgmaTimeline(config) {
  initRoarJsPsych(config);
  const initialTimeline = initRoarTimeline(config);

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
            stimulusTrial,
            ifPracticeCorrect,
            ifPracticeIncorrect,
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
            stimulusTrial,
            ifPracticeCorrect,
            ifPracticeIncorrect,
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
    getPracticeCount("practice"),
    "practice",
  ); // Practice Trials


  pushSubTaskToTimeline(
    setupStimulus,
    getStimulusCount(config.userMode),
    "stimulus",
  ); // Stimulus Trials

  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}