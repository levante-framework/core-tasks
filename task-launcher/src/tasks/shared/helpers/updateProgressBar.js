import { jsPsych } from "../../taskSetup";
import store from "store2";

export const updateProgressBar = () => {
  const currProgressBar = jsPsych.getProgressBarCompleted();

  let totalTrials

  const stimCountList = store.session("stimulusCountList");

  if (stimCountList) {
    totalTrials = stimCountList.reduce((a, b) => a + b, 0);
  } else {
    totalTrials = store.session("maxStimulusTrials")
  }

  jsPsych.setProgressBar(currProgressBar + 1 / totalTrials);
};