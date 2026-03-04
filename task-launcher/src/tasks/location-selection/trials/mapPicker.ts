import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';

export const mapPicker = {
  timeline: [
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: `
        <div class="lev-stimulus-container">
          <div class="lev-row-container instruction">
            <h2>Map picker</h2>
            <p>This scaffold step represents map-based location selection.</p>
            <p>Final location should be de-identified before saving.</p>
          </div>
        </div>
      `,
      prompt_above_buttons: true,
      button_choices: ['Continue'],
      button_html: '<button class="primary">%choice%</button>',
      keyboard_choices: 'NO_KEYS',
      data: {
        assessment_stage: 'map_picker',
        task: 'location-selection',
      },
      on_finish: (data: Record<string, any>) => {
        data.mode = 'map';
        taskStore('locationSelectionLastStep', 'map_picker');
      },
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'map',
};
