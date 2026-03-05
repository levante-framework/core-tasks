import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { getLocationSelectionDraft } from '../helpers/state';
import { ensureLocationSelectionStyles } from '../helpers/ui';
import {
  buildLocationCommitPreview,
  buildLocationCommitComputationWithPopulation,
} from '../helpers/locationCommitPreview';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderCandidateTable(candidates: Array<any>, threshold: number): string {
  if (!Array.isArray(candidates) || !candidates.length) {
    return '<p class="location-selection-status" style="margin:0.5rem;">No candidate data.</p>';
  }

  const rows = candidates.map((candidate) => {
    const pass = Boolean(candidate?.pass);
    const pop = candidate?.population == null ? 'n/a' : String(candidate.population);
    const source = escapeHtml(String(candidate?.source || 'unknown'));
    const cellId = escapeHtml(String(candidate?.cellId || ''));
    const r = escapeHtml(String(candidate?.r ?? ''));
    return `
      <tr>
        <td>${r}</td>
        <td>${escapeHtml(pop)}</td>
        <td>${source}</td>
        <td class="${pass ? 'location-selection-pass' : 'location-selection-fail'}">${pass ? 'pass' : 'fail'}</td>
        <td>${escapeHtml(String(threshold))}</td>
        <td>${cellId}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="location-selection-debug-table-wrap">
      <table class="location-selection-debug-table">
        <thead>
          <tr>
            <th>res</th>
            <th>population</th>
            <th>source</th>
            <th>pass</th>
            <th>threshold</th>
            <th>cellId</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export const reviewAndConfirm = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const draft = getLocationSelectionDraft();
    const commitPreview = buildLocationCommitPreview(draft, taskStore().locationSelectionConfig || null);
    const commitPreviewJson = commitPreview
      ? escapeHtml(JSON.stringify(commitPreview, null, 2))
      : '{"error":"No location selected yet. Go back and choose a location."}';
    const draftDetails = draft
      ? `
        <div class="location-selection-note">
          <p><strong>Selected method:</strong> ${draft.mode}</p>
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
          <div class="location-selection-stack">
            <h2>Review selection</h2>
            ${draftDetails}
            <div class="location-selection-note" style="margin-top: 0.9rem;">
              <p><strong>Location object to commit (schema preview):</strong></p>
              <p id="location-commit-preview-status" class="location-selection-status" style="margin-top:0;">Computing effective H3 with population lookup…</p>
              <pre id="location-commit-preview-json" class="location-selection-json">${commitPreviewJson}</pre>
              <div id="location-commit-candidates-table"></div>
            </div>
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
    const candidatesEl = document.getElementById('location-commit-candidates-table');
    const statusEl = document.getElementById('location-commit-preview-status');

    buildLocationCommitComputationWithPopulation(draft, config)
      .then((computed) => {
        const finalPreview = computed?.preview || buildLocationCommitPreview(draft, config);
        taskStore('locationSelectionCommitPreview', finalPreview);
        taskStore('locationSelectionCommitCandidates', computed?.candidates || []);
        if (previewEl) {
          previewEl.textContent = JSON.stringify(finalPreview, null, 2);
        }
        if (candidatesEl) {
          const threshold = Number(finalPreview?.h3?.populationThreshold || 0);
          const candidateLines = (computed?.candidates || []).map((candidate) => ({
            r: candidate.resolution,
            population: candidate.population,
            source: candidate.source,
            pass: candidate.privacyMet,
            threshold,
            cellId: candidate.cellId,
          }));
          candidatesEl.innerHTML = renderCandidateTable(candidateLines, threshold);
        }
        if (statusEl) {
          const source = finalPreview?.populationSource || 'unknown';
          statusEl.textContent = `Population source used: ${source}`;
        }
      })
      .catch(() => {
        const fallback = buildLocationCommitPreview(draft, config);
        taskStore('locationSelectionCommitPreview', fallback);
        taskStore('locationSelectionCommitCandidates', []);
        if (statusEl) statusEl.textContent = 'Population lookup unavailable; using baseline-only preview.';
        if (candidatesEl) candidatesEl.innerHTML = '<p class="location-selection-status" style="margin:0.5rem;">No candidate data.</p>';
      });
  },
  on_finish: (data: Record<string, any>) => {
    data.mode = taskStore().locationSelectionMode || null;
    data.selectedLocation = getLocationSelectionDraft();
    data.locationCommitPreview = taskStore().locationSelectionCommitPreview
      || buildLocationCommitPreview(getLocationSelectionDraft(), taskStore().locationSelectionConfig || null);
  },
};
