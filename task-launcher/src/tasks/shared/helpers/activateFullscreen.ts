import fscreen from 'fscreen';
import { Logger } from '../../../utils/logger';

/**
 * Activates fullscreen and logs any rejection.
 *
 * Must be called synchronously within a user gesture: requestFullscreen
 * requires transient activation, which expires across an await/microtask.
 */
export function activateFullscreen(source: string) {
  // fscreen.fullscreenEnabled only reflects document.fullscreenEnabled; it does
  // not guarantee the element actually has a requestFullscreen method, e.g.,
  // Mobile Safari 26.x on iOS 18.x reports fullscreen as enabled but leaves
  // document.documentElement.requestFullscreen undefined, so calling it throws
  // "requestFullscreen is not a function". Guard on the resolved request
  // function instead.
  const fullscreenElement = document.documentElement;
  if (!fscreen.fullscreenEnabled || typeof fscreen.requestFullscreenFunction(fullscreenElement) !== 'function') {
    return;
  }

  const diagnostics = {
    source,
    fullscreenEnabled: fscreen.fullscreenEnabled,
    hasFullscreenElement: Boolean(document.fullscreenElement),
    userActivationIsActive: navigator.userActivation?.isActive ?? null,
    userActivationHasBeenActive: navigator.userActivation?.hasBeenActive ?? null,
  };
  Promise.resolve(fscreen.requestFullscreen(fullscreenElement)).catch((error: unknown) => {
    Logger.getInstance().error(error instanceof Error ? error : new Error(String(error)), diagnostics);
  });
}
