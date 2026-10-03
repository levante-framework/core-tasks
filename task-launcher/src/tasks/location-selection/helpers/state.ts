import { taskStore } from '../../../taskStore';

export type LocationSelectionMode = 'gps' | 'map' | 'city_postal';

export interface LocationSelectionDraft {
  lat: number;
  lon: number;
  selectedAt: string;
}

export function setLocationSelectionDraft(draft: LocationSelectionDraft) {
  taskStore('locationSelectionDraft', draft);
}
