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
          <p>Choose one option below.<br />We only use an approximate location.</p>
        </div>
      </div>
    `,
    prompt_above_buttons: true,
    button_choices: [
      '<span class="location-method-title">Use GPS</span><span class="location-method-meta">Use browser location permission on this device.</span>',
      '<span class="location-method-title">Pick on map</span><span class="location-method-meta">Click an approximate point in the United States.</span>',
      '<span class="location-method-title">Type city/postal</span><span class="location-method-meta">Choose country first, then autocomplete a place or code.</span>',
    ],
    button_html: '<button class="primary location-method-button">%choice%</button>',
    keyboard_choices: 'NO_KEYS',
    data: {
      assessment_stage: 'mode_select_intro',
      task: 'location-selection',
    },
    on_load: () => {
      ensureLocationSelectionStyles();
      const btnGroup = document.getElementById('jspsych-html-multi-response-btngroup');
      if (btnGroup) btnGroup.classList.add('location-method-buttons');
    },
    on_finish: (data: Record<string, any>) => {
      const idx = Number(data?.response ?? data?.button_response ?? -1);
      const selectedMode = modes[idx] || 'gps';
      data.selectedMode = selectedMode;
      taskStore('locationSelectionMode', selectedMode);
    },
  },
];
