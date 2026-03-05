import { cellToLatLng, latLngToCell } from 'h3-js';
import { type LocationSelectionDraft } from './state';
import { type LocationSelectionTaskConfig } from './config';
import { lookupPopulationForCell } from './populationApi';

type LocationCommitPreview = {
  schemaVersion: 'location_v1';
  latLon: {
    lat: number;
    lon: number;
    source: 'h3_center';
  };
  h3: {
    scheme: 'h3_v1';
    baseline: {
      cellId: string;
      resolution: number;
    };
    effective: {
      cellId: string;
      resolution: number;
    };
    populationThreshold: number;
  };
  populationSource: 'kontur' | 'worldpop' | 'unknown';
  computedAt: string;
};

function getPreferredPopulationSource(
  config: Partial<LocationSelectionTaskConfig> | null | undefined,
): 'kontur' | 'worldpop' {
  const preference = String(config?.populationSourcePreference || 'kontur').toLowerCase();
  if (preference === 'worldpop') return 'worldpop';
  return 'kontur';
}

function roundTo(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function buildLocationCommitPreview(
  draft: LocationSelectionDraft | null,
  config: Partial<LocationSelectionTaskConfig> | null | undefined,
): LocationCommitPreview | null {
  if (!draft) return null;

  const baselineResolution = Number(config?.baselineResolution);
  const populationThreshold = Number(config?.populationThreshold);
  const safeBaselineResolution = Number.isInteger(baselineResolution) ? baselineResolution : 5;
  const safePopulationThreshold = Number.isFinite(populationThreshold) && populationThreshold > 0
    ? Math.round(populationThreshold)
    : 50000;
  const preferredSource = getPreferredPopulationSource(config);

  const baselineCell = latLngToCell(draft.lat, draft.lon, safeBaselineResolution);

  const effectiveCell = baselineCell;
  const [centerLat, centerLon] = cellToLatLng(effectiveCell);

  return {
    schemaVersion: 'location_v1',
    latLon: {
      lat: roundTo(centerLat, 6),
      lon: roundTo(centerLon, 6),
      source: 'h3_center',
    },
    h3: {
      scheme: 'h3_v1',
      baseline: {
        cellId: baselineCell,
        resolution: safeBaselineResolution,
      },
      effective: {
        cellId: effectiveCell,
        resolution: safeBaselineResolution,
      },
      populationThreshold: safePopulationThreshold,
    },
    populationSource: preferredSource,
    computedAt: draft.selectedAt || new Date().toISOString(),
  };
}

export async function buildLocationCommitPreviewWithPopulation(
  draft: LocationSelectionDraft | null,
  config: Partial<LocationSelectionTaskConfig> | null | undefined,
): Promise<LocationCommitPreview | null> {
  if (!draft) return null;

  const baselineResolution = Number(config?.baselineResolution);
  const maxResolution = Number(config?.maxResolution);
  const populationThreshold = Number(config?.populationThreshold);
  const safeBaselineResolution = Number.isInteger(baselineResolution) ? baselineResolution : 5;
  const safeMaxResolution =
    Number.isInteger(maxResolution) && maxResolution >= safeBaselineResolution ? maxResolution : Math.max(9, safeBaselineResolution);
  const safePopulationThreshold = Number.isFinite(populationThreshold) && populationThreshold > 0
    ? Math.round(populationThreshold)
    : 50000;
  const preferredSource = getPreferredPopulationSource(config);

  const baselineCell = latLngToCell(draft.lat, draft.lon, safeBaselineResolution);
  let effectiveCell = baselineCell;
  let effectiveResolution = safeBaselineResolution;
  let effectivePopulationSource: 'kontur' | 'worldpop' | 'unknown' = 'unknown';
  let observedPopulationSource: 'kontur' | 'worldpop' | 'unknown' = 'unknown';
  let foundPassingCell = false;

  for (let resolution = safeBaselineResolution; resolution <= safeMaxResolution; resolution += 1) {
    const cellId = latLngToCell(draft.lat, draft.lon, resolution);
    const populationResult = await lookupPopulationForCell(cellId, resolution, config);
    const population = populationResult.population;
    if (populationResult.source !== 'unknown' && observedPopulationSource === 'unknown') {
      observedPopulationSource = populationResult.source;
    }
    const privacyMet = typeof population === 'number' ? population >= safePopulationThreshold : false;

    if (privacyMet) {
      effectiveCell = cellId;
      effectiveResolution = resolution;
      effectivePopulationSource = populationResult.source;
      foundPassingCell = true;
      continue;
    }

    // Privacy-first: once we found an acceptable cell, stop at first finer failure.
    if (foundPassingCell) break;
  }

  const [centerLat, centerLon] = cellToLatLng(effectiveCell);

  return {
    schemaVersion: 'location_v1',
    latLon: {
      lat: roundTo(centerLat, 6),
      lon: roundTo(centerLon, 6),
      source: 'h3_center',
    },
    h3: {
      scheme: 'h3_v1',
      baseline: {
        cellId: baselineCell,
        resolution: safeBaselineResolution,
      },
      effective: {
        cellId: effectiveCell,
        resolution: effectiveResolution,
      },
      populationThreshold: safePopulationThreshold,
    },
    populationSource:
      effectivePopulationSource !== 'unknown'
        ? effectivePopulationSource
        : (observedPopulationSource !== 'unknown' ? observedPopulationSource : preferredSource),
    computedAt: draft.selectedAt || new Date().toISOString(),
  };
}
