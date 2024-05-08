import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { StimulusSideType, InputKey, inputButtons } from '../helpers/utils';
import { on } from 'process';

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
      document.getElementById('jspsych-content').classList.add('stack-from-bottom');
    },
    on_finish: (data) => {
      document.getElementById('jspsych-content').classList.remove('stack-from-bottom');
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choice: [InputKey.ArrowLeft, InputKey.ArrowRight],
    button_html: inputButtons,
    trial_duration: interStimulusInterval,
    response_ends_trial: false,
  }
}
