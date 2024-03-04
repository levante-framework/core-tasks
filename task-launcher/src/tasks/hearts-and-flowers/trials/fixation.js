import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';

export const fixation = {
  type: jsPsychHTMLMultiResponse,
  stimulus: () => {
    return `<div id='fixation-container-hf'>
              <span id='fixation'>+</span>
            </div>`;
  },
  on_load: () => {
    document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf');
  },
  button_choices: ['left', 'right'],
  keyboard_choice: ['ArrowLeft', 'ArrowRight'],
  button_html: [`<button class='response-btn'></button>`, `<button class='response-btn'></button>`],
  trial_duration: 800,
  response_ends_trial: false,
};
