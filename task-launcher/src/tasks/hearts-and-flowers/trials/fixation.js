import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { StimulusSideType, InputKey } from '../helpers/utils';

export function fixation(interStimulusInterval) {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
      return `<div class='haf-fixation-container'>
                <span class='fixation'>+</span>
              </div>`;
    },
    on_load: () => {
      // document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf');
      document.getElementById('jspsych-html-multi-response-stimulus').classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup').classList.add('haf-parent-container');
      document.getElementById('jspsych-html-multi-response-btngroup').classList.add('lev-response-row');
      document.getElementById('jspsych-html-multi-response-btngroup').classList.add('linear-4');
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choice: InputKey.NoKeys,
    button_html: [`
    <div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`, 
    `<div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`],
    trial_duration: interStimulusInterval,
    response_ends_trial: false,
  }
}
