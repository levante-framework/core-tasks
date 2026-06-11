import { taskStore } from '../../../taskStore';

export type LocationSelectionMode = 'gps' | 'map' | 'city_postal';

export interface LocationSelectionDraft {
  mode: LocationSelectionMode;
  lat: number;
  lon: number;
  label?: string | null;
  source?: string | null;
  accuracyMeters?: number | null;
  metadata?: Record<string, unknown> | null;
  selectedAt: string;
}

export function setLocationSelectionDraft(draft: LocationSelectionDraft) {
  taskStore('locationSelectionDraft', draft);
}

export function getLocationSelectionDraft(): LocationSelectionDraft | null {
  return (taskStore().locationSelectionDraft as LocationSelectionDraft | null) || null;
}

export function clearLocationSelectionDraft() {
  taskStore('locationSelectionDraft', null);
}
