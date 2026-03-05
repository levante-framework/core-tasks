import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { getLocationSelectionDraft, setLocationSelectionDraft } from '../helpers/state';
import { ensureLocationSelectionStyles } from '../helpers/ui';

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'jsonv2',
      zoom: '10',
      addressdetails: '1',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    if (!response.ok) return null;
    const payload = await response.json();
    return typeof payload?.display_name === 'string' ? payload.display_name : null;
  } catch {
    return null;
  }
}

export const gpsCapture = {
  timeline: [
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: `
        <div class="lev-stimulus-container">
          <div class="lev-row-container instruction location-selection-panel location-selection-copy">
            <h2>GPS location</h2>
            <p>Use your browser location to capture coordinates from this device.</p>
            <div class="location-selection-field">
              <button id="capture-gps-btn" class="primary">Use Current Location</button>
            </div>
            <p id="gps-status" class="location-selection-status">Waiting for GPS request…</p>
            <p id="gps-value" style="font-size: 0.95rem; opacity: 0.85; line-height: 1.4;"></p>
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
      on_load: () => {
        ensureLocationSelectionStyles();
        const continueButton = document.querySelector<HTMLButtonElement>('#jspsych-html-multi-response-button-0');
        const gpsButton = document.getElementById('capture-gps-btn') as HTMLButtonElement | null;
        const statusEl = document.getElementById('gps-status');
        const valueEl = document.getElementById('gps-value');
        if (continueButton) continueButton.disabled = true;

        if (!navigator.geolocation) {
          if (statusEl) statusEl.textContent = 'Geolocation is not supported by this browser.';
          return;
        }

        gpsButton?.addEventListener('click', async () => {
          if (statusEl) statusEl.textContent = 'Requesting GPS location…';
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = Number(position.coords.latitude);
              const lon = Number(position.coords.longitude);
              const accuracyMeters = Number(position.coords.accuracy);
              const label = await reverseGeocode(lat, lon);
              setLocationSelectionDraft({
                mode: 'gps',
                lat,
                lon,
                label,
                source: 'browser_geolocation',
                accuracyMeters: Number.isFinite(accuracyMeters) ? accuracyMeters : null,
                metadata: {
                  altitude: position.coords.altitude ?? null,
                  speed: position.coords.speed ?? null,
                },
                selectedAt: new Date().toISOString(),
              });
              if (statusEl) statusEl.textContent = 'GPS location captured.';
              if (valueEl) {
                valueEl.textContent =
                  `${lat.toFixed(5)}, ${lon.toFixed(5)} · accuracy ≈ ${Math.round(accuracyMeters || 0)}m` +
                  (label ? ` · ${label}` : '');
              }
              if (continueButton) continueButton.disabled = false;
            },
            (error) => {
              if (statusEl) statusEl.textContent = `GPS error: ${error.message}`;
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            },
          );
        });
      },
      on_finish: (data: Record<string, any>) => {
        const draft = getLocationSelectionDraft();
        data.mode = 'gps';
        data.geolocationSupported = typeof navigator !== 'undefined' && !!navigator.geolocation;
        data.selectedLocation = draft || null;
        taskStore('locationSelectionLastStep', 'gps_capture');
      },
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'gps',
};
