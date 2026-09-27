import { cellToLatLng, latLngToCell } from 'h3-js';
import { type LocationSelectionDraft } from './state';
import { getLocationSelectionTaskConfig } from './config';
import { lookupPopulationForCell } from './populationApi';
import { taskStore } from '../../../taskStore';
import { persistLocation } from './persistLocation';
import { LocationV1 } from '@levante-framework/firekit';
import { Logger } from '../../../utils';

function roundTo(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function buildLocationCommitPreviewWithPopulation(
  draft: LocationSelectionDraft | null,
): Promise<LocationV1 | null> {
  if (!draft) return null;

  const { baselineResolution, minResolution, maxResolution, populationThreshold } =
    getLocationSelectionTaskConfig();
  const baselineCell = latLngToCell(draft.lat, draft.lon, baselineResolution);
  let effectiveCell = baselineCell;
  let effectiveResolution = baselineResolution;
  let effectivePopulationSource: 'kontur' | 'worldpop' | 'unknown' = 'unknown';
  let observedPopulationSource: 'kontur' | 'worldpop' | 'unknown' = 'unknown';
  let privacyCompliantCellFound = false;
  const cellIdByResolution = new Map<number, string>();
  for (let resolution = minResolution; resolution <= maxResolution; resolution += 1) {
    cellIdByResolution.set(resolution, latLngToCell(draft.lat, draft.lon, resolution));
  }

  const evaluateResolution = async (resolution: number) => {
    const cellId = cellIdByResolution.get(resolution);
    if (!cellId) return null;

    const populationResult = await lookupPopulationForCell(cellId, resolution);
    const population = populationResult.population;
    if (populationResult.source !== 'unknown' && observedPopulationSource === 'unknown') {
      observedPopulationSource = populationResult.source;
    }
    const privacyMet = typeof population === 'number' ? population >= populationThreshold : false;
    return { cellId, resolution, populationResult, privacyMet };
  };

  const baselineEvaluation = await evaluateResolution(baselineResolution);
  if (baselineEvaluation?.privacyMet) {
    effectiveCell = baselineEvaluation.cellId;
    effectiveResolution = baselineEvaluation.resolution;
    effectivePopulationSource = baselineEvaluation.populationResult.source;

    for (let resolution = baselineResolution + 1; resolution <= maxResolution; resolution += 1) {
      const evaluation = await evaluateResolution(resolution);
      if (!evaluation) continue;
      if (evaluation.privacyMet) {
        effectiveCell = evaluation.cellId;
        effectiveResolution = evaluation.resolution;
        effectivePopulationSource = evaluation.populationResult.source;
        continue;
      }
      break;
    }
  } else {
    for (let resolution = baselineResolution - 1; resolution >= minResolution; resolution -= 1) {
      const evaluation = await evaluateResolution(resolution);
      if (!evaluation?.privacyMet) continue;
      effectiveCell = evaluation.cellId;
      effectiveResolution = evaluation.resolution;
      effectivePopulationSource = evaluation.populationResult.source;
      privacyCompliantCellFound = true;
      break;
    }
  }

  if (!privacyCompliantCellFound) {
    const logger = Logger.getInstance();

    logger.capture(
      'No privacy-compliant cell found.',
      {
        taskName: taskStore().task
      }
    );
  }

  const [centerLat, centerLon] = cellToLatLng(effectiveCell);

  return {
    schemaVersion: 'location_v1',
    privacyMet: privacyCompliantCellFound,
    latLon: privacyCompliantCellFound ? {
      lat: roundTo(centerLat, 6),
      lon: roundTo(centerLon, 6),
      source: 'h3_center',
    } : undefined,
    h3: {
      scheme: 'h3_v1',
      baseline: baselineEvaluation?.privacyMet
        ? { h3Index: baselineCell, resolution: baselineResolution }
        : undefined,
      effective: privacyCompliantCellFound
        ? { h3Index: effectiveCell, resolution: effectiveResolution }
        : undefined,
      populationThreshold,
    },
    populationSource:
      effectivePopulationSource !== 'unknown'
        ? effectivePopulationSource
        : (observedPopulationSource !== 'unknown' ? observedPopulationSource : 'kontur'),
    computedAt: draft.selectedAt || new Date().toISOString(),
  };
}

export async function buildLocationSavePayload() {
  const draft = taskStore().locationSelectionDraft;
  const location = await buildLocationCommitPreviewWithPopulation(draft);

  if (location) {
    persistLocation(location);
  }
  taskStore("locationDataSaved", true);
}
