import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { jsPsych } from "../../taskSetup";
import { getStimulus, isMaxTimeoutReached } from '../helpers';

// choosing the next stimulus from the corpus occurs during the fixation trial
// prior to the actual display of the stimulus, where user response is collected
// the array allows us to use the same structure for all corpuses
const setupData = [
  {
    onFinish: () => {
      getStimulus('practice');
    },
  },
  {
    onFinish: () => {
      getStimulus('stimulus');
    },
  },
];

const setupTrials = setupData.map((trial, i) => {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: `<div id='fixation-container'>
                <p>+</p>
              </div>`,
    prompt: '',
    choices: 'NO_KEYS',
    trial_duration: 350,

    data: {
      task: 'fixation',
    },
    on_finish: trial.onFinish,
  };
});

export const setupPractice = setupTrials[0];
export const setupStimulus = setupTrials[1];

export const setupPracticeConditional = {
  timeline: [setupPractice],
  conditional_function: () => {
    // don't play when skipping trials because app is finished
    if (isMaxTimeoutReached()) { 
      return false;
    } else {
      return true;
    }
  },
};

export const setupStimulusConditional = {
  timeline: [setupStimulus],
  conditional_function: () => {
    // don't play when skipping trials because app is finished
    if (isMaxTimeoutReached()) { 
      return false;
    } else {
      return true;
    }
  },
};
