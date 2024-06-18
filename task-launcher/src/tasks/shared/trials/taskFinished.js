import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../helpers';

export const taskFinished = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    const t = taskStore().translations;
    return `
        <div class='instructions-container'>
            <h1 class='instructions-title'>${t.taskFinished}</h1>
    
            <footer>${t.generalFooter}</footer>
        </div>`;
  },
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Exit</button>',
  // trial_duration: 1000,
};
