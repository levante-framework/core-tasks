import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import store from "store2";

export const taskFinished = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  on_load: () => {
    // timer cleanup
    if (store.session.get("maxTimerId")) { 
      clearTimeout(store.session.get("maxTimerId"));
      store.session.set("maxTimerId", null);
    }
  },
  stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>You've completed the task -- thank you!</h1>

        <p>
            
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to exit</footer>
    </div>`,
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Exit</button>',
  // trial_duration: 1000,
};
