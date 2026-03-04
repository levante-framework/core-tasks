import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';

export const reviewAndConfirm = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const mode = taskStore().locationSelectionMode || 'unknown';
    return `
      <div class="lev-stimulus-container">
        <div class="lev-row-container instruction">
          <h2>Review selection</h2>
          <p>Selected mode: <strong>${mode}</strong></p>
          <p>This task scaffold is ready for integrating GPS/map/search + on-device H3 obfuscation.</p>
        </div>
      </div>
    `;
  },
  prompt_above_buttons: true,
  button_choices: ['Confirm'],
  button_html: '<button class="primary">%choice%</button>',
  keyboard_choices: 'NO_KEYS',
  data: {
    assessment_stage: 'review_confirm',
    task: 'location-selection',
  },
  on_finish: (data: Record<string, any>) => {
    data.mode = taskStore().locationSelectionMode || null;
  },
};
