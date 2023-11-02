import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'

export const fixation = {
  type: jsPsychHTMLMultiResponse,
  stimulus: () => {
      return (
          `<div id='fixation-container'>
            <span id='fixation'>+</span>
          </div>`
      )
  },
  button_choices: ['left', 'right'],
  keyboard_choice: ['ArrowLeft', 'ArrowRight'],
  button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
  trial_duration: 800,
  response_ends_trial: false
}
