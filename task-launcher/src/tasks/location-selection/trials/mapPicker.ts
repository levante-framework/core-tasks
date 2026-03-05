import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { getLocationSelectionDraft, setLocationSelectionDraft } from '../helpers/state';
import { ensureLocationSelectionStyles } from '../helpers/ui';

declare global {
  interface Window {
    L?: any;
  }
}

let leafletLoader: Promise<any> | null = null;
const US_LOWER_48_BOUNDS: [[number, number], [number, number]] = [[24.396308, -124.848974], [49.384358, -66.885444]];
const US_LABEL_POINTS: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Seattle', lat: 47.6062, lon: -122.3321 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'Denver', lat: 39.7392, lon: -104.9903 },
  { name: 'Dallas', lat: 32.7767, lon: -96.7970 },
  { name: 'Houston', lat: 29.7604, lon: -95.3698 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
  { name: 'Atlanta', lat: 33.7490, lon: -84.3880 },
  { name: 'Miami', lat: 25.7617, lon: -80.1918 },
  { name: 'Washington, DC', lat: 38.9072, lon: -77.0369 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Boston', lat: 42.3601, lon: -71.0589 },
];
const US_STATE_LABEL_POINTS: Array<{ abbr: string; lat: number; lon: number }> = [
  { abbr: 'AL', lat: 32.8067, lon: -86.7911 }, { abbr: 'AZ', lat: 34.0489, lon: -111.0937 },
  { abbr: 'AR', lat: 35.2010, lon: -91.8318 }, { abbr: 'CA', lat: 36.7783, lon: -119.4179 },
  { abbr: 'CO', lat: 39.5501, lon: -105.7821 }, { abbr: 'CT', lat: 41.6032, lon: -73.0877 },
  { abbr: 'DE', lat: 38.9108, lon: -75.5277 }, { abbr: 'FL', lat: 27.6648, lon: -81.5158 },
  { abbr: 'GA', lat: 32.1574, lon: -82.9071 }, { abbr: 'ID', lat: 44.0682, lon: -114.7420 },
  { abbr: 'IL', lat: 40.6331, lon: -89.3985 }, { abbr: 'IN', lat: 39.7684, lon: -86.1581 },
  { abbr: 'IA', lat: 41.8780, lon: -93.0977 }, { abbr: 'KS', lat: 39.0119, lon: -98.4842 },
  { abbr: 'KY', lat: 37.8393, lon: -84.2700 }, { abbr: 'LA', lat: 30.9843, lon: -91.9623 },
  { abbr: 'ME', lat: 45.2538, lon: -69.4455 }, { abbr: 'MD', lat: 39.0458, lon: -76.6413 },
  { abbr: 'MA', lat: 42.4072, lon: -71.3824 }, { abbr: 'MI', lat: 44.3148, lon: -85.6024 },
  { abbr: 'MN', lat: 46.7296, lon: -94.6859 }, { abbr: 'MS', lat: 32.3547, lon: -89.3985 },
  { abbr: 'MO', lat: 37.9643, lon: -91.8318 }, { abbr: 'MT', lat: 46.8797, lon: -110.3626 },
  { abbr: 'NE', lat: 41.4925, lon: -99.9018 }, { abbr: 'NV', lat: 38.8026, lon: -116.4194 },
  { abbr: 'NH', lat: 43.1939, lon: -71.5724 }, { abbr: 'NJ', lat: 40.0583, lon: -74.4057 },
  { abbr: 'NM', lat: 34.5199, lon: -105.8701 }, { abbr: 'NY', lat: 43.2994, lon: -74.2179 },
  { abbr: 'NC', lat: 35.7596, lon: -79.0193 }, { abbr: 'ND', lat: 47.5515, lon: -101.0020 },
  { abbr: 'OH', lat: 40.4173, lon: -82.9071 }, { abbr: 'OK', lat: 35.0078, lon: -97.0929 },
  { abbr: 'OR', lat: 43.8041, lon: -120.5542 }, { abbr: 'PA', lat: 41.2033, lon: -77.1945 },
  { abbr: 'RI', lat: 41.5801, lon: -71.4774 }, { abbr: 'SC', lat: 33.8361, lon: -81.1637 },
  { abbr: 'SD', lat: 43.9695, lon: -99.9018 }, { abbr: 'TN', lat: 35.5175, lon: -86.5804 },
  { abbr: 'TX', lat: 31.9686, lon: -99.9018 }, { abbr: 'UT', lat: 39.3210, lon: -111.0937 },
  { abbr: 'VT', lat: 44.5588, lon: -72.5778 }, { abbr: 'VA', lat: 37.4316, lon: -78.6569 },
  { abbr: 'WA', lat: 47.7511, lon: -120.7401 }, { abbr: 'WV', lat: 38.5976, lon: -80.4549 },
  { abbr: 'WI', lat: 43.7844, lon: -88.7879 }, { abbr: 'WY', lat: 43.0759, lon: -107.2903 },
];
const US_STATE_LABEL_PRIORITY: string[] = [
  'CA', 'TX', 'FL', 'NY', 'WA', 'CO', 'AZ', 'IL', 'GA', 'NC', 'PA', 'MI', 'OH', 'TN', 'MN', 'MA', 'VA', 'MO', 'NJ', 'WI',
];

function ensureMapLabelStyles() {
  const styleId = 'location-selection-map-label-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .location-map-state-label {
      background: transparent;
      border: none;
      box-shadow: none;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .location-map-city-label {
      background: transparent;
      border: none;
      box-shadow: none;
      color: #1f2937;
      font-size: 11px;
      font-weight: 500;
    }
  `;
  document.head.appendChild(style);
}

function shouldKeepLabel(candidate: { x: number; y: number }, used: Array<{ x: number; y: number }>, minPxDistance: number) {
  for (let i = 0; i < used.length; i += 1) {
    const dx = candidate.x - used[i].x;
    const dy = candidate.y - used[i].y;
    if ((dx * dx) + (dy * dy) < (minPxDistance * minPxDistance)) {
      return false;
    }
  }
  return true;
}

function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoader) return leafletLoader;

  leafletLoader = new Promise((resolve, reject) => {
    const cssId = 'leaflet-css-location-selection';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js-location-selection';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing && window.L) {
      resolve(window.L);
      return;
    }
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', () => reject(new Error('Failed to load Leaflet script')));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Failed to load Leaflet script'));
    document.head.appendChild(script);
  });

  return leafletLoader;
}

export const mapPicker = {
  timeline: [
    {
      type: jsPsychHtmlMultiResponse,
      stimulus: `
        <div class="lev-stimulus-container">
          <div class="lev-row-container instruction location-selection-panel location-selection-copy">
            <h2>Pick on map (United States)</h2>
            <p>Click your approximate location on the US map. The map is limited to the contiguous US.</p>
            <div id="location-map-picker" style="height: 360px; width: 100%; border-radius: 8px; margin-top: 0.8rem;"></div>
            <p id="map-picker-status" class="location-selection-status">Pick a point on the map.</p>
          </div>
        </div>
      `,
      prompt_above_buttons: true,
      button_choices: ['Continue'],
      button_html: '<button class="primary">%choice%</button>',
      keyboard_choices: 'NO_KEYS',
      data: {
        assessment_stage: 'map_picker',
        task: 'location-selection',
      },
      on_load: async () => {
        ensureLocationSelectionStyles();
        const continueButton = document.querySelector<HTMLButtonElement>('#jspsych-html-multi-response-button-0');
        const statusEl = document.getElementById('map-picker-status');
        if (continueButton) continueButton.disabled = true;

        try {
          const L = await loadLeaflet();
          ensureMapLabelStyles();
          const mapEl = document.getElementById('location-map-picker');
          if (!mapEl) throw new Error('Map container not found');
          const bounds = L.latLngBounds(US_LOWER_48_BOUNDS[0], US_LOWER_48_BOUNDS[1]);
          const map = L.map(mapEl, {
            zoomControl: true,
            attributionControl: false,
            maxBounds: bounds.pad(0.12),
            maxBoundsViscosity: 1.0,
            minZoom: 3,
          });
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 18,
          }).addTo(map);
          map.fitBounds(bounds.pad(0.02), { padding: [20, 20] });

          const cityLabelsLayer = L.layerGroup().addTo(map);
          const stateLabelsLayer = L.layerGroup().addTo(map);

          const drawLabelsForZoom = () => {
            const zoom = Number(map.getZoom?.() || 4);
            cityLabelsLayer.clearLayers();
            stateLabelsLayer.clearLayers();
            const usedScreenPoints: Array<{ x: number; y: number }> = [];
            const mapBounds = map.getBounds?.();
            const stateRank = new Map(US_STATE_LABEL_PRIORITY.map((abbr, idx) => [abbr, idx]));

            if (zoom <= 6) {
              const maxLabels = zoom <= 4 ? 10 : zoom === 5 ? 16 : 28;
              const minPxDistance = zoom <= 4 ? 52 : zoom === 5 ? 42 : 34;
              const rankedStates = US_STATE_LABEL_POINTS
                .slice()
                .sort((a, b) => {
                  const aRank = stateRank.has(a.abbr) ? Number(stateRank.get(a.abbr)) : 999;
                  const bRank = stateRank.has(b.abbr) ? Number(stateRank.get(b.abbr)) : 999;
                  return aRank - bRank;
                });

              rankedStates.forEach((point) => {
                if (stateLabelsLayer.getLayers().length >= maxLabels) return;
                if (mapBounds && !mapBounds.contains([point.lat, point.lon])) return;
                const screen = map.latLngToContainerPoint([point.lat, point.lon]);
                const spot = { x: Number(screen.x), y: Number(screen.y) };
                if (!shouldKeepLabel(spot, usedScreenPoints, minPxDistance)) return;
                usedScreenPoints.push(spot);
                const marker = L.circleMarker([point.lat, point.lon], {
                  radius: 1,
                  color: '#334155',
                  fillColor: '#334155',
                  fillOpacity: 0.05,
                  weight: 0.5,
                }).addTo(stateLabelsLayer);
                marker.bindTooltip(point.abbr, {
                  permanent: true,
                  direction: 'center',
                  className: 'location-map-state-label',
                  opacity: 0.9,
                });
                marker.openTooltip();
              });
              return;
            }

            US_LABEL_POINTS.forEach((point) => {
              if (mapBounds && !mapBounds.contains([point.lat, point.lon])) return;
              const screen = map.latLngToContainerPoint([point.lat, point.lon]);
              const spot = { x: Number(screen.x), y: Number(screen.y) };
              if (!shouldKeepLabel(spot, usedScreenPoints, 40)) return;
              usedScreenPoints.push(spot);
              const marker = L.circleMarker([point.lat, point.lon], {
                radius: 2.5,
                color: '#1f2937',
                fillColor: '#ffffff',
                fillOpacity: 0.9,
                weight: 1,
              }).addTo(cityLabelsLayer);
              marker.bindTooltip(point.name, {
                permanent: true,
                direction: 'right',
                offset: [4, 0],
                className: 'location-map-city-label',
                opacity: 0.9,
              });
              marker.openTooltip();
            });
          };
          drawLabelsForZoom();
          map.on('zoomend', drawLabelsForZoom);

          let marker: any = null;
          map.on('click', (e: any) => {
            const lat = Number(e?.latlng?.lat);
            const lon = Number(e?.latlng?.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
            if (marker) {
              marker.setLatLng([lat, lon]);
            } else {
              marker = L.marker([lat, lon]).addTo(map);
            }
            setLocationSelectionDraft({
              mode: 'map',
              lat,
              lon,
              label: null,
              source: 'leaflet_map_click',
              selectedAt: new Date().toISOString(),
            });
            if (statusEl) statusEl.textContent = `Selected: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            if (continueButton) continueButton.disabled = false;
          });
        } catch (error: any) {
          if (statusEl) statusEl.textContent = `Map failed to load: ${error?.message || error}`;
        }
      },
      on_finish: (data: Record<string, any>) => {
        const draft = getLocationSelectionDraft();
        data.mode = 'map';
        data.selectedLocation = draft || null;
        taskStore('locationSelectionLastStep', 'map_picker');
      },
    },
  ],
  conditional_function: () => taskStore().locationSelectionMode === 'map',
};
