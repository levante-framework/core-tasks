import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';

export const gpsCapture = {
  timeline: [
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: `
        <div class="lev-stimulus-container">
          <div class="lev-row-container instruction">
            <h2>GPS location</h2>
            <p>This scaffold step represents GPS capture on device.</p>
            <p>Raw coordinates should be transformed on-device before persistence.</p>
          </div>
        </div>
      `,
      prompt_above_buttons: true,
      button_choices: ['Continue'],
      button_html: '<button class="primary">%choice%</button>',
      keyboard_choices: 'NO_KEYS',
      data: {
        assessment_stage: 'gps_capture',
        task: 'location-selection',
      },
      on_finish: (data: Record<string, any>) => {
        data.mode = 'gps';
        data.geolocationSupported = typeof navigator !== 'undefined' && !!navigator.geolocation;
        taskStore('locationSelectionLastStep', 'gps_capture');
      },
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'gps',
};
