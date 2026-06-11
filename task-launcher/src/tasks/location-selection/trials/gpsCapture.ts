import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { setLocationSelectionDraft } from '../helpers/state';
import { jsPsych } from '../../taskSetup';
import { buildLocationSavePayload } from '../helpers/locationCommitPreview';

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
      stimulus: () => {
        const t = taskStore().translations;

        return `
          <div class="lev-stimulus-container">
            <div class="lev-row-container location-selection" id="container">
              <h1 id="gps-status"></h1>
              <div class="location-selection-field">
                <button id="gps-retry-btn" class="primary" style="display:none;">${t.locationButtonAskAgain}</button>
              </div>
            </div>
          </div>
        `
      },
      keyboard_choices: 'NO_KEYS',
      on_load: () => {
        taskStore('userWentBack', false);

        const t = taskStore().translations;
        const continueButton = document.querySelector<HTMLButtonElement>('#jspsych-html-multi-response-button-0');
        const retryButton = document.getElementById('gps-retry-btn') as HTMLButtonElement | null;
        const statusEl = document.getElementById('gps-status');
        if (continueButton) {
          continueButton.disabled = true;
          continueButton.style.display = 'none';
        }

        if (!navigator.geolocation) {
          if (statusEl) statusEl.textContent = t.locationTextBroswer5;
          if (retryButton) {
            retryButton.textContent = t.locationButtonBack;
            retryButton.style.display = 'inline-block';
          }
          return;
        }

        const requestGps = () => {
          if (statusEl) statusEl.textContent = t.locationTextBrowser3;
          if (retryButton) retryButton.style.display = 'none';
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
              jsPsych.finishTrial();
            },
            (error) => {
              if (statusEl) statusEl.textContent = t.locationTextBrowser4;
              if (retryButton) retryButton.style.display = 'inline-block';

              let backButton = document.getElementById("back-button");
              if (!backButton) {
                backButton = document.createElement('button');
                backButton.id = "back-button";

                const container = document.getElementById("container");

                backButton.classList.add("primary");
                backButton.textContent = t.locationButtonBack;
                container?.appendChild(backButton);

                backButton.addEventListener('click', () => {
                  taskStore('userWentBack', true);
                  jsPsych.finishTrial();
                });
              }

              const retryButtonWidth = document.getElementById("gps-retry-btn")?.getBoundingClientRect().width;
              if (retryButtonWidth) {
                backButton.style.width = `${retryButtonWidth}px`;
              }
              
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            },
          );
        };

        retryButton?.addEventListener('click', requestGps);
        requestGps();
      },
      on_finish: async () => {
        if (!taskStore().userWentBack) {
          const location = await buildLocationSavePayload();

          jsPsych.data.addDataToLastTrial({
            location: location
          });
        }
      },
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'gps',
};
