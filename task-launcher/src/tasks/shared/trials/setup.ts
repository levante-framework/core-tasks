import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { getStimulus } from '../helpers';

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
  {
    onFinish: () => {}
  }
];

const setupTrials = setupData.map((trial) => {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: `<div id='lev-fixation-container'><p>+</p></div>`,
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
export const fixationOnly = setupTrials[2]; 
