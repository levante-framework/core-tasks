import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { getLocationSelectionDraft } from '../helpers/state';
import { ensureLocationSelectionStyles } from '../helpers/ui';
import {
  buildLocationCommitPreview,
  buildLocationCommitPreviewWithPopulation,
} from '../helpers/locationCommitPreview';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const reviewAndConfirm = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const mode = taskStore().locationSelectionMode || 'unknown';
    const draft = getLocationSelectionDraft();
    const commitPreview = buildLocationCommitPreview(draft, taskStore().locationSelectionConfig || null);
    const commitPreviewJson = escapeHtml(JSON.stringify(commitPreview, null, 2));
    const draftDetails = draft
      ? `
        <div class="location-selection-note">
          <p><strong>Mode:</strong> ${draft.mode}</p>
          <p><strong>Source:</strong> ${draft.source || 'unknown'}</p>
          ${draft.label ? `<p><strong>Label:</strong> ${draft.label}</p>` : ''}
          ${draft.accuracyMeters ? `<p><strong>Accuracy:</strong> ~${Math.round(draft.accuracyMeters)}m</p>` : ''}
          <p><strong>Raw coordinates:</strong> hidden</p>
        </div>
      `
      : '<p class="location-selection-status">No location selected yet.</p>';
    return `
      <div class="lev-stimulus-container">
        <div class="lev-row-container instruction location-selection-panel location-selection-copy">
          <h2>Review selection</h2>
          <p>Selected mode: <strong>${mode}</strong></p>
          ${draftDetails}
          <div class="location-selection-note" style="margin-top: 0.9rem;">
            <p><strong>Location object to commit (schema preview):</strong></p>
            <p id="location-commit-preview-status" class="location-selection-status" style="margin-top:0;">Computing effective H3 with population lookup…</p>
            <pre id="location-commit-preview-json" style="margin:0; padding:0.65rem; background:#0f172a; color:#e2e8f0; border-radius:6px; font-size:0.82rem; overflow:auto; line-height:1.35;">${commitPreviewJson}</pre>
          </div>
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
  on_load: () => {
    ensureLocationSelectionStyles();
    const draft = getLocationSelectionDraft();
    const config = taskStore().locationSelectionConfig || null;
    const previewEl = document.getElementById('location-commit-preview-json');
    const statusEl = document.getElementById('location-commit-preview-status');

    buildLocationCommitPreviewWithPopulation(draft, config)
      .then((computedPreview) => {
        const finalPreview = computedPreview || buildLocationCommitPreview(draft, config);
        taskStore('locationSelectionCommitPreview', finalPreview);
        if (previewEl) {
          previewEl.textContent = JSON.stringify(finalPreview, null, 2);
        }
        if (statusEl) {
          const source = finalPreview?.populationSource || 'unknown';
          statusEl.textContent = `Population source used: ${source}`;
        }
      })
      .catch(() => {
        const fallback = buildLocationCommitPreview(draft, config);
        taskStore('locationSelectionCommitPreview', fallback);
        if (statusEl) statusEl.textContent = 'Population lookup unavailable; using baseline-only preview.';
      });
  },
  on_finish: (data: Record<string, any>) => {
    data.mode = taskStore().locationSelectionMode || null;
    data.selectedLocation = getLocationSelectionDraft();
    data.locationCommitPreview = taskStore().locationSelectionCommitPreview
      || buildLocationCommitPreview(getLocationSelectionDraft(), taskStore().locationSelectionConfig || null);
  },
};
