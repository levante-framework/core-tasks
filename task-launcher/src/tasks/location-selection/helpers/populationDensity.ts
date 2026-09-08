/**
 * Population density via a fixed 1 km² tile.
 *
 * Mirrors the geo-strategy gallery approach in levante-web-dashboard
 * (`scripts/generate-geo-strategy-gallery.js` → `buildKmSquareGeometry` +
 * `estimatePopulationFromWorldPop`): build a small square centered on the point
 * and ask WorldPop how many people are inside it. Because the tile is 1 km²,
 * the population count is the density.
 *
 * Why a fixed tile rather than the H3 cell: `populationApi.ts` returns counts for
 * whichever H3 resolution the privacy walk lands on, so cell-derived densities are
 * not comparable across participants. A fixed tile is resolution-independent.
 *
 * Privacy note: the gallery computes this at the original GPS point. The tile is
 * small, so treat the result as a derived metric to store rather than a coordinate
 * to transmit — only the tile polygon leaves the device.
 *
 * The gallery runs WorldPop rasters locally through Python; in the browser we use
 * the public WorldPop API instead (same endpoint `populationApi.ts` already falls
 * back to).
 */

import { queryWorldPopForPolygon, type GeoPolygon, type PopulationLookupConfig } from './populationApi';

/** Half-width of the density tile, in km. Mirrors the gallery's `TILE_HALF_KM`. */
export const DENSITY_TILE_HALF_KM = 0.5;

export type PopulationDensityResult = {
  populationDensityPerKm2: number | null;
  source: 'worldpop' | 'unknown';
};

function kmToLatDelta(km: number): number {
  return km / 111.0;
}

function kmToLonDelta(km: number, lat: number): number {
  const denom = 111.0 * Math.cos((lat * Math.PI) / 180);
  return denom ? km / denom : 0;
}

function roundCoordFixed(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Square polygon of side `2 * halfKm`, centered on the point. */
export function buildKmSquareGeometry(centerLon: number, centerLat: number, halfKm: number): GeoPolygon {
  const latOffset = kmToLatDelta(halfKm);
  const lonOffset = kmToLonDelta(halfKm, centerLat);
  const ring = [
    [roundCoordFixed(centerLon - lonOffset), roundCoordFixed(centerLat - latOffset)],
    [roundCoordFixed(centerLon + lonOffset), roundCoordFixed(centerLat - latOffset)],
    [roundCoordFixed(centerLon + lonOffset), roundCoordFixed(centerLat + latOffset)],
    [roundCoordFixed(centerLon - lonOffset), roundCoordFixed(centerLat + latOffset)],
    [roundCoordFixed(centerLon - lonOffset), roundCoordFixed(centerLat - latOffset)],
  ];
  return { type: 'Polygon', coordinates: [ring] };
}

/**
 * Population density (people per km²) at a point, from a 1 km² WorldPop tile.
 *
 * @param lat Tile center latitude.
 * @param lon Tile center longitude.
 * @param config Reuses `populationApiTimeoutMs` from the population lookup config.
 * @param halfKm Override the tile half-width (default 0.5 km, i.e. a 1 km² tile).
 */
export async function lookupPopulationDensity(
  lat: number,
  lon: number,
  config?: PopulationLookupConfig | null,
  halfKm: number = DENSITY_TILE_HALF_KM,
): Promise<PopulationDensityResult> {
  const centerLat = Number(lat);
  const centerLon = Number(lon);
  const safeHalfKm = Number.isFinite(Number(halfKm)) && Number(halfKm) > 0 ? Number(halfKm) : DENSITY_TILE_HALF_KM;
  const areaKm2 = (2 * safeHalfKm) ** 2;
  const tile = { halfKm: safeHalfKm, areaKm2, centerLat, centerLon };

  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLon)) {
    return { populationDensityPerKm2: null, source: 'unknown' };
  }

  const timeoutMs = Number(config?.populationApiTimeoutMs) > 0 ? Number(config?.populationApiTimeoutMs) : 25000;
  const geometry = buildKmSquareGeometry(centerLon, centerLat, safeHalfKm);
  const population = await queryWorldPopForPolygon(geometry, timeoutMs);

  if (typeof population !== 'number') {
    return { populationDensityPerKm2: null, source: 'unknown' };
  }

  return {
    populationDensityPerKm2: Math.round(population / areaKm2),
    source: 'worldpop',
  };
}
