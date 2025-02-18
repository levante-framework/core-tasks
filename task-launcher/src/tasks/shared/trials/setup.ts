import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { getStimulus } from '../helpers';

// choosing the next stimulus from the corpus occurs during the fixation trial
// prior to the actual display of the stimulus, where user response is collected
// the array allows us to use the same structure for all corpuses

const fixationTrial = (corpusType?: string, blockNum?: number) => {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: `<div id='lev-fixation-container'><p>+</p></div>`,
    prompt: '',
    choices: 'NO_KEYS',
    trial_duration: 350,
    data: {
      task: 'fixation',
    },
    on_finish: () => {
      if (corpusType) {
        if (blockNum != undefined) {
          getStimulus(corpusType, blockNum);
        } else {
          getStimulus(corpusType); 
        }
      }
    },
  };
};

export const setupPractice = fixationTrial("practice");
export const setupStimulus = fixationTrial("stimulus");
export const setupStimulusFromBlock = (blockNum: number) => fixationTrial("stimulus", blockNum);
export const fixationOnly = fixationTrial(); 

