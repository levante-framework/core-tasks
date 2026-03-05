import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { getLocationSelectionDraft, setLocationSelectionDraft } from '../helpers/state';
import { ensureLocationSelectionStyles } from '../helpers/ui';

interface NominatimResult {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
}

interface CountryOption {
  code: string;
  label: string;
}

const SUPPORTED_COUNTRY_CODES: string[] = ['US', 'DE', 'GB', 'NL', 'CA', 'CO', 'IN', 'AR', 'GH', 'CH'];
const SUPPORTED_COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  NL: 'Netherlands',
  CA: 'Canada',
  CO: 'Colombia',
  IN: 'India',
  AR: 'Argentina',
  GH: 'Ghana',
  CH: 'Switzerland',
};

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(value: string): string {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightLabel(label: string, query: string): string {
  const safeLabel = escapeHtml(label);
  const q = String(query || '').trim();
  if (!q || q.length < 2) return safeLabel;
  const expr = new RegExp(`(${escapeRegex(q)})`, 'ig');
  return safeLabel.replace(expr, '<mark style="background:#fef08a; padding:0;">$1</mark>');
}

function getCountryLabel(code: string): string {
  const iso = String(code || '').trim().toUpperCase();
  const explicitName = SUPPORTED_COUNTRY_NAMES[iso];
  if (explicitName) return explicitName;
  try {
    if (typeof Intl !== 'undefined' && (Intl as any).DisplayNames) {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      return dn.of(iso) || iso;
    }
  } catch {
    // Ignore and use fallback.
  }
  return iso;
}

async function loadCountryOptions(): Promise<CountryOption[]> {
  return SUPPORTED_COUNTRY_CODES.map((code) => ({
    code,
    label: `${getCountryLabel(code)} — ${code}`,
  }));
}

async function searchLocations(query: string, countryCode?: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '10',
  });
  if (countryCode) params.set('countrycodes', String(countryCode || '').toLowerCase());
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function buildDraftFromSuggestion(selected: NominatimResult, selectedCountry: string) {
  const lat = Number(selected?.lat);
  const lon = Number(selected?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    mode: 'city_postal' as const,
    lat,
    lon,
    label: String(selected.display_name || ''),
    source: 'nominatim_search',
    metadata: {
      placeId: selected.place_id ?? null,
      resultType: selected.type ?? null,
      countryCode: selectedCountry,
    },
    selectedAt: new Date().toISOString(),
  };
}

export const searchCityPostal = {
  timeline: [
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: `
        <div class="lev-stimulus-container">
          <div class="lev-row-container instruction location-selection-panel location-selection-copy">
            <h2>City / postal search</h2>
            <p>Select a country, then type a city/town or postal code.</p>
            <div class="location-selection-field">
              <label for="location-country-select"><strong>Country</strong></label>
              <select id="location-country-select" style="display:block; width:100%; min-height: 40px; margin-top: 0.3rem; padding: 0 0.5rem;"></select>
            </div>
            <div class="location-selection-field">
              <label for="location-query-input"><strong>City / Postal code</strong></label>
              <input id="location-query-input" type="text" placeholder="Start typing..." autocomplete="off" style="display:block; width:100%; min-height: 40px; margin-top: 0.3rem; padding: 0 0.7rem;" />
              <div id="location-autocomplete-dropdown" style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; display: none; max-height: 260px; overflow-y: auto; background: #fff;"></div>
            </div>
            <p id="location-search-status" class="location-selection-status">Choose a country to begin.</p>
          </div>
        </div>
      `,
      prompt_above_buttons: true,
      button_choices: ['Continue'],
      button_html: '<button class="primary">%choice%</button>',
      keyboard_choices: 'NO_KEYS',
      data: {
        assessment_stage: 'city_postal_search',
        task: 'location-selection',
      },
      on_load: () => {
        ensureLocationSelectionStyles();
        const continueButton = document.querySelector<HTMLButtonElement>('#jspsych-html-multi-response-button-0');
        const inputEl = document.getElementById('location-query-input') as HTMLInputElement | null;
        const countryEl = document.getElementById('location-country-select') as HTMLSelectElement | null;
        const statusEl = document.getElementById('location-search-status');
        const dropdownEl = document.getElementById('location-autocomplete-dropdown');

        if (continueButton) continueButton.disabled = true;
        let selectedCountry = 'US';
        taskStore('locationSelectionPendingCountry', selectedCountry);
        let debounceHandle: number | null = null;
        let latestRequestId = 0;
        let latestResults: NominatimResult[] = [];
        let highlightedIndex = -1;
        let latestQuery = '';
        let hasExplicitSelection = false;

        const hideDropdown = () => {
          if (!dropdownEl) return;
          dropdownEl.style.display = 'none';
          dropdownEl.innerHTML = '';
          highlightedIndex = -1;
        };

        const selectResult = (selected: NominatimResult) => {
          const draft = buildDraftFromSuggestion(selected, selectedCountry);
          if (!draft) return;
          setLocationSelectionDraft(draft);
          taskStore('locationSelectionPendingSuggestion', selected);
          hasExplicitSelection = true;
          if (statusEl) statusEl.textContent = `Selected: ${selected.display_name || `${draft.lat.toFixed(5)}, ${draft.lon.toFixed(5)}`}`;
          if (inputEl) inputEl.value = String(selected.display_name || inputEl.value);
          hideDropdown();
          if (continueButton) continueButton.disabled = false;
        };

        const renderResults = (results: NominatimResult[]) => {
          if (!dropdownEl) return;
          latestResults = results.slice();
          taskStore('locationSelectionPendingSuggestion', null);
          if (highlightedIndex >= latestResults.length) highlightedIndex = latestResults.length - 1;
          if (!results.length) {
            dropdownEl.innerHTML = '<div style="padding: 0.7rem;">No matches found.</div>';
            dropdownEl.style.display = 'block';
            return;
          }
          dropdownEl.innerHTML = results
            .map((result, index) => {
              const label = String(result.display_name || 'Unknown location');
              const bg = index === highlightedIndex ? '#eff6ff' : '#fff';
              const labelHtml = highlightLabel(label, latestQuery);
              return `<button type="button" data-result-index="${index}" style="display:block; width:100%; padding:0.6rem 0.75rem; border:none; border-bottom:1px solid #f1f5f9; text-align:left; background:${bg}; cursor:pointer;">${labelHtml}</button>`;
            })
            .join('');
          dropdownEl.style.display = 'block';
          if (highlightedIndex >= 0) {
            const active = dropdownEl.querySelector<HTMLButtonElement>(`button[data-result-index="${highlightedIndex}"]`);
            active?.scrollIntoView({ block: 'nearest' });
          }
          dropdownEl.querySelectorAll<HTMLButtonElement>('button[data-result-index]').forEach((button) => {
            button.addEventListener('mousedown', (event) => {
              event.preventDefault();
              const idx = Number(button.dataset.resultIndex);
              const selected = latestResults[idx];
              if (!selected) return;
              selectResult(selected);
            });
          });
        };

        const runSearch = async () => {
          const query = String(inputEl?.value || '').trim();
          latestQuery = query;
          if (!selectedCountry) {
            hideDropdown();
            if (statusEl) statusEl.textContent = 'Select a country first.';
            return;
          }
          if (!query) {
            hideDropdown();
            if (statusEl) statusEl.textContent = 'Type at least 2 characters.';
            return;
          }
          if (query.length < 2) {
            hideDropdown();
            taskStore('locationSelectionPendingSuggestion', null);
            return;
          }
          if (statusEl) statusEl.textContent = `Searching in ${selectedCountry}…`;
          const requestId = latestRequestId + 1;
          latestRequestId = requestId;
          const results = await searchLocations(query, selectedCountry);
          if (requestId !== latestRequestId) return;
          highlightedIndex = results.length ? 0 : -1;
          renderResults(results);
          if (statusEl) statusEl.textContent = results.length ? 'Pick the best match from the dropdown.' : 'No matches found.';
        };

        loadCountryOptions()
          .then((countries) => {
            if (!countryEl) return;
            countryEl.innerHTML = countries
              .map((country) => `<option value="${country.code}" ${country.code === 'US' ? 'selected' : ''}>${country.label}</option>`)
              .join('');
            selectedCountry = countryEl.value || 'US';
            taskStore('locationSelectionPendingCountry', selectedCountry);
            if (statusEl) statusEl.textContent = 'Country selected. Start typing a city or postal code.';
          })
          .catch((error: any) => {
            if (statusEl) statusEl.textContent = `Could not load full country list (${error?.message || error}).`;
          });

        countryEl?.addEventListener('change', () => {
          selectedCountry = String(countryEl.value || '').toUpperCase();
          taskStore('locationSelectionPendingCountry', selectedCountry);
          hasExplicitSelection = false;
          if (continueButton) continueButton.disabled = true;
          hideDropdown();
          if (inputEl) inputEl.value = '';
          taskStore('locationSelectionDraft', null);
          taskStore('locationSelectionPendingSuggestion', null);
          latestResults = [];
          if (statusEl) statusEl.textContent = `Country set to ${selectedCountry}. Start typing to see matches.`;
        });

        inputEl?.addEventListener('input', () => {
          hasExplicitSelection = false;
          taskStore('locationSelectionDraft', null);
          taskStore('locationSelectionPendingSuggestion', null);
          if (continueButton) continueButton.disabled = true;
          if (debounceHandle) {
            window.clearTimeout(debounceHandle);
          }
          debounceHandle = window.setTimeout(() => {
            runSearch().catch((error: any) => {
              if (statusEl) statusEl.textContent = `Search failed: ${error?.message || error}`;
            });
          }, 250);
        });

        inputEl?.addEventListener('focus', () => {
          const hasOptions = Boolean(dropdownEl && dropdownEl.innerHTML.trim());
          if (hasOptions && dropdownEl) dropdownEl.style.display = 'block';
        });

        document.addEventListener('click', (event) => {
          const target = event.target as HTMLElement | null;
          if (!target) return;
          const clickedInside = Boolean(target.closest('#location-autocomplete-dropdown') || target.closest('#location-query-input'));
          if (!clickedInside) hideDropdown();
        });

        inputEl?.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key === 'ArrowDown') {
            if (latestResults.length) {
              event.preventDefault();
              highlightedIndex = Math.min(latestResults.length - 1, highlightedIndex + 1);
              renderResults(latestResults);
            }
            return;
          }
          if (event.key === 'ArrowUp') {
            if (latestResults.length) {
              event.preventDefault();
              highlightedIndex = Math.max(0, highlightedIndex - 1);
              renderResults(latestResults);
            }
            return;
          }
          if (event.key === 'Escape') {
            hideDropdown();
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < latestResults.length) {
              selectResult(latestResults[highlightedIndex]);
              return;
            }
            if (!hasExplicitSelection) {
              if (statusEl) statusEl.textContent = 'Select a result from the dropdown first.';
              if (continueButton) continueButton.disabled = true;
              return;
            }
            runSearch().catch((error: any) => {
              if (statusEl) statusEl.textContent = `Search failed: ${error?.message || error}`;
            });
          }
        });
      },
      on_finish: (data: Record<string, any>) => {
        const draft = getLocationSelectionDraft();
        data.mode = 'city_postal';
        data.selectedLocation = draft || null;
        taskStore('locationSelectionLastStep', 'city_postal_search');
      },
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'city_postal',
};
