import { setLocationSelectionDraft } from '../helpers/state';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { enableOkButton } from '../../shared/helpers';
import { taskStore } from '../../../taskStore';

const WORLD_BOUNDS: [[number, number], [number, number]] = [[-90, -180], [90, 180]];

// public tile proxy URLs to firebase cloud functions so api key is not exposed to browser
const CARTO_BASEMAP_TILE_URL_DEV =
  'https://us-central1-hs-levante-admin-dev.cloudfunctions.net/cartoBasemapTile/light_all/{z}/{x}/{y}{r}.png';
const CARTO_BASEMAP_TILE_URL_PROD =
  'https://us-central1-hs-levante-admin-prod.cloudfunctions.net/cartoBasemapTile/light_all/{z}/{x}/{y}{r}.png';

function getCartoBasemapTileUrlTemplate(): string {
  const projectId =
    taskStore().firekit?.firebaseProject?.firebaseApp?.options?.projectId;
  if (!taskStore().firekit || projectId === 'hs-levante-admin-dev') {
    return CARTO_BASEMAP_TILE_URL_DEV;
  }
  return CARTO_BASEMAP_TILE_URL_PROD;
}

export async function setupMap() {
  const mapEl = document.getElementById('location-map-picker');
  if (!mapEl) throw new Error('Map container not found');
  const bounds = L.latLngBounds(WORLD_BOUNDS[0], WORLD_BOUNDS[1]);
  const map = L.map(mapEl, {
    zoomControl: true,
    attributionControl: false,
    maxBounds: bounds.pad(0.12),
    maxBoundsViscosity: 1.0,
    minZoom: 3,
  });
  L.tileLayer(getCartoBasemapTileUrlTemplate(), {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 18,
  }).addTo(map);
  map.fitBounds(bounds.pad(0.02), { padding: [20, 20] });

  let marker: L.CircleMarker | null = null;
  map.on('click', (e: L.LeafletMouseEvent) => {
    const lat = Number(e?.latlng?.lat);
    const lon = Number(e?.latlng?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.circleMarker([lat, lon]).addTo(map);
    }
    setLocationSelectionDraft({
      mode: 'map',
      lat,
      lon,
      label: null,
      source: 'leaflet_map_click',
      selectedAt: new Date().toISOString(),
    });
    enableOkButton();
  });
}
