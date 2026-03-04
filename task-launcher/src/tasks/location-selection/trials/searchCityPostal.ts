import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';

export const searchCityPostal = {
  timeline: [
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: `
        <div class="lev-stimulus-container">
          <div class="lev-row-container instruction">
            <h2>City / postal search</h2>
            <p>This scaffold step represents typing a city or postal code.</p>
            <p>Use on-device obfuscation before storing final location.</p>
          </div>
        </div>
      `,
      prompt_above_buttons: true,
      button_choices: ['Continue'],
      button_html: '<button class="primary">%choice%</button>',
      keyboard_choices: 'NO_KEYS',
      data: {
        assessment_stage: 'city_postal_search',
        task: 'location-selection',
      },
      on_finish: (data: Record<string, any>) => {
        data.mode = 'city_postal';
        taskStore('locationSelectionLastStep', 'city_postal_search');
      },
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'city_postal',
};
