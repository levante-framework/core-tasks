import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { getLocationSelectionDraft } from '../helpers/state';

export const reviewAndConfirm = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const mode = taskStore().locationSelectionMode || 'unknown';
    const draft = getLocationSelectionDraft();
    const draftDetails = draft
      ? `
        <div style="margin-top: 1rem; text-align: left;">
          <p><strong>Mode:</strong> ${draft.mode}</p>
          <p><strong>Coordinates:</strong> ${draft.lat.toFixed(5)}, ${draft.lon.toFixed(5)}</p>
          <p><strong>Source:</strong> ${draft.source || 'unknown'}</p>
          ${draft.label ? `<p><strong>Label:</strong> ${draft.label}</p>` : ''}
          ${draft.accuracyMeters ? `<p><strong>Accuracy:</strong> ~${Math.round(draft.accuracyMeters)}m</p>` : ''}
        </div>
      `
      : '<p style="margin-top: 1rem;">No location selected yet.</p>';
    return `
      <div class="lev-stimulus-container">
        <div class="lev-row-container instruction">
          <h2>Review selection</h2>
          <p>Selected mode: <strong>${mode}</strong></p>
          ${draftDetails}
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
    data.selectedLocation = getLocationSelectionDraft();
  },
};
