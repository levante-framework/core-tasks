import { cellToLatLng, latLngToCell } from 'h3-js';
import type { LocationV1 } from '@levante-framework/firekit';

type H3Cell = NonNullable<LocationV1['h3']['effective']>;
import { type LocationSelectionDraft } from './state';
import { getLocationSelectionTaskConfig } from './config';
import { lookupPopulationForCell } from './populationApi';
import { taskStore } from '../../../taskStore';
import { persistLocation } from './persistLocation';
import { Logger } from '../../../utils';

function toH3Cell(h3Index: string, resolution: number): H3Cell {
  const center = cellToLatLng(h3Index);
  return {
    h3Index,
    resolution,
    center: [center[0], center[1]],
  };
}

function resolvePopulationSource(
  effective: 'kontur' | 'worldpop' | 'unknown',
  observed: 'kontur' | 'worldpop' | 'unknown',
): 'kontur' | 'worldpop' {
  if (effective !== 'unknown') return effective;
  if (observed !== 'unknown') return observed;
  return 'kontur';
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
    privacyCompliantCellFound = true;
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

  return {
    schemaVersion: 'location_v1',
    h3: {
      scheme: 'h3_v1',
      baseline: baselineEvaluation?.privacyMet
        ? toH3Cell(baselineCell, baselineResolution)
        : undefined,
      effective: privacyCompliantCellFound
        ? toH3Cell(effectiveCell, effectiveResolution)
        : undefined,
    },
    population: {
      source: resolvePopulationSource(effectivePopulationSource, observedPopulationSource),
      threshold: populationThreshold,
    },
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
