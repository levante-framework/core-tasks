export type LocationSelectionTaskConfig = {
  populationThreshold: number;
  baselineResolution: number;
  maxResolution: number;
};

export function getLocationSelectionTaskConfig(config: Record<string, any>): LocationSelectionTaskConfig {
  const threshold = Number(config?.populationThreshold);
  const baseline = Number(config?.baselineResolution);
  const maxRes = Number(config?.maxResolution);

  return {
    populationThreshold: Number.isFinite(threshold) && threshold > 0 ? Math.round(threshold) : 50000,
    baselineResolution:
      Number.isFinite(baseline) && Number.isInteger(baseline) && baseline >= 0 && baseline <= 15
        ? baseline
        : 5,
    maxResolution:
      Number.isFinite(maxRes) && Number.isInteger(maxRes) && maxRes >= 0 && maxRes <= 15
        ? maxRes
        : 9,
  };
}
