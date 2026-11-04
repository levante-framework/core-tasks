import { type CoarseLocation, CoarseLocationSchema, type H3Cell } from '@levante-framework/levante-zod';
import { cellToLatLng, latLngToCell } from 'h3-js';
import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils';
import { getLocationSelectionTaskConfig } from './config';
import { persistLocation } from './persistLocation';
import { lookupPopulationForCell } from './populationApi';
import type { LocationSelectionDraft } from './state';

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
): Promise<CoarseLocation | null> {
  if (!draft) return null;

  const { baselineResolution, minResolution, maxResolution, populationThreshold } = getLocationSelectionTaskConfig();
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

    logger.capture('No privacy-compliant cell found.', {
      taskName: taskStore().task,
    });
  }

  const h3Baseline = baselineEvaluation?.privacyMet ? toH3Cell(baselineCell, baselineResolution) : undefined;
  const h3Effective = privacyCompliantCellFound ? toH3Cell(effectiveCell, effectiveResolution) : undefined;
  const h3: { baseline?: H3Cell; effective?: H3Cell } = {};

  if (h3Baseline) h3.baseline = h3Baseline;
  if (h3Effective) h3.effective = h3Effective;

  const parsed = CoarseLocationSchema.safeParse({
    schemaVersion: 'location_v1',
    h3: h3,
    population: {
      source: resolvePopulationSource(effectivePopulationSource, observedPopulationSource),
      threshold: populationThreshold,
    },
    computedAt: draft.selectedAt || new Date().toISOString(),
  });

  if (!parsed.success) {
    Logger.getInstance().capture('Failed to parse CoarseLocation', {
      taskName: taskStore().task,
      issues: parsed.error.issues,
    });
    return null;
  }

  return parsed.data;
}

export async function buildLocationSavePayload() {
  taskStore('locationDataSaved', false);

  try {
    const draft = taskStore().locationSelectionDraft;
    const location = await buildLocationCommitPreviewWithPopulation(draft);

    if (location) {
      await persistLocation(location);
    }
  } catch (error) {
    Logger.getInstance().capture('Failed to save location data', {
      taskName: taskStore().task,
      error: error instanceof Error ? error.message : String(error),
    });

    taskStore('locationWriteFailed', true);
  } finally {
    taskStore('locationDataSaved', true);
  }
}
