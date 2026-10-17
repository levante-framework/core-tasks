export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 7;

export type LocationSelectionTaskConfig = {
  populationThreshold: number;
  baselineResolution: number;
  minResolution: number;
  maxResolution: number;
};

export function getLocationSelectionTaskConfig(): LocationSelectionTaskConfig {
  return {
    populationThreshold: 20000,
    baselineResolution: 5,
    minResolution: H3_MIN_RESOLUTION,
    maxResolution: H3_MAX_RESOLUTION,
  };
}
