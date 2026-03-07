export const H3_MAX_RESOLUTION = 7;

export type LocationSelectionTaskConfig = {
  populationThreshold: number;
  baselineResolution: number;
  maxResolution: number;
  populationSourcePreference: 'kontur' | 'worldpop' | 'auto';
  konturPopulationApiUrl: string;
  konturPopulationBatchApiUrl: string;
  worldpopPopulationApiUrl: string;
  populationApiTimeoutMs: number;
  populationBatchEnabled: boolean;
};

export function getLocationSelectionTaskConfig(config: Record<string, any>): LocationSelectionTaskConfig {
  const threshold = Number(config?.populationThreshold);
  const baseline = Number(config?.baselineResolution);
  const maxRes = Number(config?.maxResolution);
  const sourcePreference = String(config?.populationSourcePreference || 'kontur').trim().toLowerCase();
  const konturPopulationApiUrl = String(config?.konturPopulationApiUrl || '/api/population-kontur-h3').trim();
  const konturPopulationBatchApiUrl =
    String(config?.konturPopulationBatchApiUrl || '/api/population-kontur-h3-batch').trim();
  const worldpopPopulationApiUrl = String(config?.worldpopPopulationApiUrl || '/api/population-worldpop-h3').trim();
  const populationApiTimeoutMs = Number(config?.populationApiTimeoutMs);
  const populationBatchEnabled = Boolean(config?.populationBatchEnabled);

  return {
    populationThreshold: Number.isFinite(threshold) && threshold > 0 ? Math.round(threshold) : 50000,
    baselineResolution:
      Number.isFinite(baseline) && Number.isInteger(baseline) && baseline >= 0 && baseline <= 15
        ? baseline
        : 5,
    maxResolution:
      Number.isFinite(maxRes) && Number.isInteger(maxRes) && maxRes >= 0 && maxRes <= 15
        ? Math.min(maxRes, H3_MAX_RESOLUTION)
        : H3_MAX_RESOLUTION,
    populationSourcePreference:
      sourcePreference === 'kontur' || sourcePreference === 'worldpop' || sourcePreference === 'auto'
        ? sourcePreference
        : 'kontur',
    konturPopulationApiUrl,
    konturPopulationBatchApiUrl,
    worldpopPopulationApiUrl,
    populationApiTimeoutMs:
      Number.isFinite(populationApiTimeoutMs) && populationApiTimeoutMs > 0
        ? Math.round(populationApiTimeoutMs)
        : 2500,
    populationBatchEnabled,
  };
}
