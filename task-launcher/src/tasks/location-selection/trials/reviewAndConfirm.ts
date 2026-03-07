import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
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

const DEFAULT_LOCATION_SAVE_FUNCTION = 'upsertLocation';
const DEFAULT_LOCATION_SAVE_PROJECT = 'hs-levante-admin-dev';
const DEFAULT_LOCATION_SAVE_EMULATOR_HOST = 'http://localhost:5005';
const DEFAULT_LOCATION_SAVE_COLLECTION = 'locations';

function isLocationSaveDebugEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('locationSaveDebug') === 'true'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function getLocationSaveSettings() {
  const params = new URLSearchParams(window.location.search);
  return {
    functionName: params.get('locationSaveFunction') || DEFAULT_LOCATION_SAVE_FUNCTION,
    projectId: params.get('locationSaveProject') || DEFAULT_LOCATION_SAVE_PROJECT,
    emulatorHost: params.get('locationSaveEmulatorHost') || DEFAULT_LOCATION_SAVE_EMULATOR_HOST,
    collection: params.get('locationSaveCollection') || DEFAULT_LOCATION_SAVE_COLLECTION,
  };
}

function buildLocationSavePayload() {
  const params = new URLSearchParams(window.location.search);
  const draft = getLocationSelectionDraft();
  const config = taskStore().locationSelectionConfig || null;
  const preview = taskStore().locationSelectionCommitPreview || buildLocationCommitPreview(draft, config);
  return {
    location: preview,
    collection: params.get('locationSaveCollection') || DEFAULT_LOCATION_SAVE_COLLECTION,
    meta: {
      task: 'location-selection',
      mode: taskStore().locationSelectionMode || null,
      selectedLocation: draft,
      locationCommitPreview: preview,
      locationCommitCandidates: taskStore().locationSelectionCommitCandidates || [],
      pid: params.get('pid'),
      language: params.get('lng'),
      sentAt: new Date().toISOString(),
    },
  };
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
            ${isLocationSaveDebugEnabled() ? `
              <div class="location-selection-note" style="margin-top: 0.9rem;">
                <p><strong>Test save location</strong></p>
                <div class="location-selection-field">
                  <label for="location-save-target"><strong>Save target</strong></label>
                  <select id="location-save-target" style="display:block; width:100%; min-height: 40px; margin-top: 0.3rem; padding: 0 0.5rem;">
                    <option value="emulator">To Emulator</option>
                    <option value="dev">To -dev</option>
                  </select>
                </div>
                <button id="location-save-button" class="primary">Save</button>
                <p id="location-save-meta" class="location-selection-status" style="margin-top:0.5rem;"></p>
                <p id="location-save-debug" class="location-selection-status" style="margin-top:0;"></p>
                <p id="location-save-status" class="location-selection-status" style="margin-top:0;"></p>
              </div>
            ` : ''}
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

    if (!isLocationSaveDebugEnabled()) return;

    const settings = getLocationSaveSettings();
    const targetSelect = document.getElementById('location-save-target') as HTMLSelectElement | null;
    const saveButton = document.getElementById('location-save-button') as HTMLButtonElement | null;
    const saveStatus = document.getElementById('location-save-status');
    const saveMeta = document.getElementById('location-save-meta');
    const saveDebug = document.getElementById('location-save-debug');

    if (saveMeta) {
      saveMeta.textContent = `Function: ${settings.functionName} | Project: ${settings.projectId} | Collection: ${settings.collection}`;
    }
    if (saveDebug) {
      const globalApp = (window as any).__firebaseApp;
      const hasGlobalConfig = Boolean((window as any).__firebaseConfig);
      const appName = globalApp?.name || getApps()[0]?.name || 'none';
      const authApp = globalApp || getApps()[0] || null;
      const authed = authApp ? Boolean(getAuth(authApp).currentUser) : false;
      saveDebug.textContent = `Firebase app: ${appName} | Config: ${hasGlobalConfig ? 'window' : 'none'} | Authed: ${authed ? 'yes' : 'no'}`;
    }

    if (!targetSelect || !saveButton || !saveStatus) return;

    saveButton.addEventListener('click', async () => {
      const target = (targetSelect.value || 'emulator') as 'emulator' | 'dev';
      const startedAt = Date.now();
      saveStatus.textContent = `Saving to ${target}...`;
      try {
        const payload = buildLocationSavePayload();
        const globalApp = (typeof window !== 'undefined' ? (window as any).__firebaseApp : null) || null;
        const globalConfig = (typeof window !== 'undefined' ? (window as any).__firebaseConfig : null) || null;
        const apps = getApps();
        let app = globalApp || apps[0] || null;
        if (!app && globalConfig) {
          app = initializeApp(globalConfig);
        }
        if (!app) {
          throw new Error('Firebase app not initialized');
        }

        const functionsInstance = getFunctions(app, 'us-central1');
        if (target === 'emulator') {
          const emulatorUrl = new URL(settings.emulatorHost);
          const host = emulatorUrl.hostname === '127.0.0.1' ? 'localhost' : emulatorUrl.hostname;
          connectFunctionsEmulator(functionsInstance, host, Number(emulatorUrl.port || 5002));
        }

        const callable = httpsCallable(functionsInstance, settings.functionName, { timeout: 15000 });
        const result = await callable(payload);
        const elapsedMs = Date.now() - startedAt;
        saveStatus.textContent = `Saved ✓ (${elapsedMs}ms) ${JSON.stringify(result.data)}`;
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        const err = error as { code?: string; message?: string; details?: unknown };
        const details = err?.details ? ` | details: ${JSON.stringify(err.details)}` : '';
        const code = err?.code ? `code: ${err.code} | ` : '';
        const message = err?.message || (error instanceof Error ? error.message : String(error));
        saveStatus.textContent = `Save failed (${elapsedMs}ms): ${code}${message}${details}`;
      }
    });
  },
  on_finish: (data: Record<string, any>) => {
    data.mode = taskStore().locationSelectionMode || null;
    data.selectedLocation = getLocationSelectionDraft();
    data.locationCommitPreview = taskStore().locationSelectionCommitPreview
      || buildLocationCommitPreview(getLocationSelectionDraft(), taskStore().locationSelectionConfig || null);
  },
};
