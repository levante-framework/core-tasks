import type { RoarAppkit } from '@levante-framework/firekit';
import type { CoarseLocation } from '@levante-framework/levante-zod';
import { taskStore } from '../../../taskStore';

let firekit: RoarAppkit;

export function initLocationPersistence(config: Record<string, any>) {
  firekit = config.firekit;
}

export async function persistLocation(location: CoarseLocation) {
  if (!taskStore().demoMode && location && firekit) {
    await firekit.updateUser({ location });
  }
}
