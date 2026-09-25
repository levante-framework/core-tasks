import { setLocationSelectionDraft } from '../helpers/state';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { enableOkButton } from '../../shared/helpers';
import { getCartoBasemapTileUrlTemplate } from './cloudFunctions';

const WORLD_BOUNDS: [[number, number], [number, number]] = [[-90, -180], [90, 180]];

export async function setupMap() {
  const mapEl = document.getElementById('location-map-picker');
  if (!mapEl) throw new Error('Map container not found');
  const bounds = L.latLngBounds(WORLD_BOUNDS[0], WORLD_BOUNDS[1]);
  const map = L.map(mapEl, {
    zoomControl: true,
    maxBounds: bounds.pad(0.12),
    maxBoundsViscosity: 1.0,
    minZoom: 3,
  });
  L.tileLayer(getCartoBasemapTileUrlTemplate(), {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>',
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
      lat,
      lon,
      selectedAt: new Date().toISOString(),
    });
    enableOkButton();
  });
}
