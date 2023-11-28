import "regenerator-runtime/runtime";
import store from "store2";
import { getStimulusCount, initTrialSaving, initTimeline, } from "./config/config";
// setup
import { jsPsych } from "./jsPsych";
import { preloadTrials, initializeCat, mediaAssets } from "./experimentSetup";
// trials
import { stimulus } from "./trials/stimulus";
import { setupMainTrial, setupPracticeTrial } from "./trials/setupFixation";
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

  if (config.story) {
    createStory();
  }

  const timeline = [
    preloadTrials,
    // ...initialTimeline.timeline
  ];

  // this function adds all the trials in a subtask (and the mid-subtask breaks) to the timeline
  // fixationBlock:  an array of fixation trials (to fetch next stimulus) configured in stimulusLetterName.js
  // stimulusCounts: an array of numbers, each entry defines the number of trials before a mid-subtask break
  let breakNum = 0;

  const pushSubTaskToTimeline = (
    subTaskInitBlock,
    fixationBlock,
    stimulusCounts,
  ) => {
    // begin the subtask
    timeline.push(subTaskInitBlock);

    for (let i = 0; i < stimulusCounts.length; i++) {
      const surveyBlock = {
          timeline: [
            fixationBlock,
            stimulus,
            practiceFeedback,
            audioFeedback
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

      timeline.push(surveyBlock);



      // Figure out what is going on here
      if (config.story) {
        if (i + 1 !== stimulusCounts.length) {
          // no break on the last block of the subtask
          timeline.push(storyBreakList[breakNum]);
          breakNum += 1;
          if (breakNum === storyBreakList.length) {
            breakNum = 0;
          }
        }
      }
    } 
  };

  initializeCat();
  
  // story intro
  if (config.story) timeline.push(introAndInstructions);


  pushSubTaskToTimeline(
    subTaskInitPractice,
    setupPracticeTrial,
    [config.numOfPracticeTrials],
  ); // Practice Trials
  
  if (config.story) timeline.push(practiceDone);


  pushSubTaskToTimeline(
    subTaskInitStimulus,
    setupMainTrial,
    getStimulusCount(),
  ); // Stimulus Trials

  if (config.story) timeline.push(endTrial); // End Task
  timeline.push(exitFullscreen);

  return { jsPsych, timeline };
}
