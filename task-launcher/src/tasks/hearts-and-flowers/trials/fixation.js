import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { StimulusSideType, InputKey } from '../helpers/utils';

export function fixation(interStimulusInterval) {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
      return `<div id='fixation-container-hf'>
                <span id='fixation'>+</span>
              </div>`;
    },
    on_load: () => {
      document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf');
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choice: InputKey.NoKeys,
    button_html: [`<button class='response-btn'></button>`, `<button class='response-btn'></button>`],
    trial_duration: interStimulusInterval,
    response_ends_trial: false,
  }
}
