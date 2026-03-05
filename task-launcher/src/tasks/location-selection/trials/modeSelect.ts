import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { ensureLocationSelectionStyles } from '../helpers/ui';

const modes = ['gps', 'map', 'city_postal'] as const;

export const modeSelect = {
  type: jsPsychHtmlMultiResponse,
  stimulus: `
    <div class="lev-stimulus-container">
      <div class="lev-row-container instruction location-selection-panel location-selection-copy">
        <h2>Choose how to provide location</h2>
        <p>Select one method to continue.</p>
      </div>
    </div>
  `,
  prompt_above_buttons: true,
  button_choices: ['Use GPS', 'Pick on map', 'Type city/postal'],
  button_html: '<button class="primary">%choice%</button>',
  keyboard_choices: 'NO_KEYS',
  data: {
    assessment_stage: 'mode_select',
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
};
