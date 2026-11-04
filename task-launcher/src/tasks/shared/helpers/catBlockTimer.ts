import { taskStore } from '../../../taskStore';
import { getActiveTaskElapsedMs } from './appTimer';

/**
 * Per-block time budget for multi-block CAT tasks.
 * Set once at timeline build via setCatBlockTimeLimit; started per block via startCatBlockTimer.
 */

export function setCatBlockTimeLimit(maxTimeMinutes: number, effectiveBlockCount: number): void {
  const maxTimeInMilliseconds = Math.max(maxTimeMinutes, 1) * 60000;

  taskStore('catBlockTimeLimitMs', maxTimeInMilliseconds / effectiveBlockCount);
}

export function startCatBlockTimer(): void {
  taskStore('catBlockStartElapsedMs', getActiveTaskElapsedMs());
}

export function getCatBlockElapsedMs(): number {
  const blockStart = taskStore().catBlockStartElapsedMs;
  if (typeof blockStart !== 'number') {
    return 0;
  }

  return getActiveTaskElapsedMs() - blockStart;
}

export function getCatBlockTimeRemainingMs(): number {
  const limitMs = taskStore().catBlockTimeLimitMs ?? 0;
  return limitMs - getCatBlockElapsedMs();
}

export function isCatBlockTimeExpired(isLastBlock = false): boolean {
  // Last block uses the full-task timer (checkEndTaskEarly) so instruction buffer applies.
  if (isLastBlock) {
    return false;
  }

  const limitMs = taskStore().catBlockTimeLimitMs;
  if (!limitMs || limitMs <= 0) {
    return false;
  }

  const blockStart = taskStore().catBlockStartElapsedMs;
  if (typeof blockStart !== 'number') {
    return false;
  }

  return getCatBlockTimeRemainingMs() <= 0;
}
