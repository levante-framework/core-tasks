import JsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';

export const afcMatch = {
  type: JsPsychHTMLMultiResponse,
  stimulus: () => {
    return (
      `<div>
        <h1 id='prompt'>This is a test</h1>
        <div id='shapes-container'>
          <img src=${mediaAssets.images.lgBlueCircle} alt='stimulus' />
        </div>
      </div>
      `
    )
  },
  button_choices: ['Continue'],
  on_load: () => {
    // create img elements and arrange in grid as cards
  },

  response_ends_trial: false,
}