/* eslint-disable arrow-body-style */
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";
import { getStimulus } from "./getStimulus";

// choosing the next stimulus from the corpus occurs during the fixation trial
// prior to the actual display of the stimulus, where user response is collected
// the array allows us to use the same structure for all corpuses
const setupData = [
  {
    onFinish: () => {
      getStimulus("practice");
    },
  },
  {
    onFinish: () => {
      getStimulus("stimulus");
    },
  },
];

const setupTrials = setupData.map((trial, i) => {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function () {
      return `<div class='stimulus_div'>
                <p class='stimulus'> </p>
              </div>`;
    },
    prompt: "",
    choices: "NO_KEYS",
    trial_duration: 10, // store.session.get("config").timing.fixationTime, //TODO fix

    data: {
      task: "fixation",
    },
    on_finish: trial.onFinish,
  };
});

export const setupPracticeTrial = setupTrials[0];
export const setupMainTrial = setupTrials[1];
