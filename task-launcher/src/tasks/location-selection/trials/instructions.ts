import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { ensureLocationSelectionStyles } from '../helpers/ui';

const modes = ['gps', 'map', 'city_postal'] as const;

export const instructions = [
  {
    type: jsPsychHtmlMultiResponse,
    stimulus: `
      <div class="lev-stimulus-container">
        <div class="lev-row-container instruction location-selection-panel location-selection-copy location-selection-intro">
          <h2>How would you like to share location?</h2>
          <p>Choose the method that is easiest for you. You can use GPS, tap a map, or search by city/postal code.</p>
          <p>We only need an approximate location for planning and analysis.</p>
          <div class="location-selection-note">
            <p><strong>What to expect:</strong></p>
            <p>- GPS: uses your browser location permission.</p>
            <p>- Map: click a point in the United States.</p>
            <p>- City/Postal: choose from suggested places after selecting a country.</p>
          </div>
        </div>
      </div>
    `,
    prompt_above_buttons: true,
    button_choices: ['Use GPS', 'Pick on map', 'Type city/postal'],
    button_html: '<button class="primary">%choice%</button>',
    keyboard_choices: 'NO_KEYS',
    data: {
      assessment_stage: 'mode_select_intro',
      task: 'location-selection',
    },
    on_load: () => {
      ensureLocationSelectionStyles();
    },
    on_finish: (data: Record<string, any>) => {
      const idx = Number(data?.response ?? data?.button_response ?? -1);
      const selectedMode = modes[idx] || 'gps';
      data.selectedMode = selectedMode;
      taskStore('locationSelectionMode', selectedMode);
    },
  },
];
