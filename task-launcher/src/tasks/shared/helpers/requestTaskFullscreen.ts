import fscreen from 'fscreen';
import { Logger } from '../../../utils/logger';

export type FullscreenRequestSource = 'enterFullscreen' | 'utilityButton';

export interface FullscreenDenialContext {
  source: FullscreenRequestSource;
  errorName: string | null;
  errorMessage: string | null;
  fullscreenEnabled: boolean;
  fscreenFullscreenEnabled: boolean;
  hasFullscreenElement: boolean;
  fullscreenElementTag: string | null;
  visibilityState: DocumentVisibilityState | null;
  hasFocus: boolean | null;
  isEmbedded: boolean | null;
  userActivationIsActive: boolean | null;
  userActivationHasBeenActive: boolean | null;
  fullscreenPermission: string | null;
}

export function requestTaskFullscreen(source: FullscreenRequestSource): void {
  const fullscreenElement = document.documentElement;
  if (!fscreen.fullscreenEnabled || typeof fscreen.requestFullscreenFunction(fullscreenElement) !== 'function') {
    return;
  }

  const diagnostics = collectFullscreenDiagnostics(source);

  try {
    const result = fscreen.requestFullscreen(fullscreenElement) as Promise<void> | undefined;
    if (result && typeof result.catch === 'function') {
      void result.catch((error: unknown) => {
        void reportFullscreenDenial(error, diagnostics);
      });
    }
  } catch (error) {
    void reportFullscreenDenial(error, diagnostics);
  }
}

function collectFullscreenDiagnostics(
  source: FullscreenRequestSource,
): Omit<FullscreenDenialContext, 'fullscreenPermission'> {
  const userActivation = getUserActivation();
  const fullscreenNode = fscreen.fullscreenElement ?? document.fullscreenElement;

  return {
    source,
    errorName: null,
    errorMessage: null,
    fullscreenEnabled: Boolean(document.fullscreenEnabled),
    fscreenFullscreenEnabled: Boolean(fscreen.fullscreenEnabled),
    hasFullscreenElement: Boolean(fullscreenNode),
    fullscreenElementTag:
      fullscreenNode && typeof (fullscreenNode as Element).tagName === 'string'
        ? (fullscreenNode as Element).tagName
        : null,
    visibilityState: document.visibilityState ?? null,
    hasFocus: typeof document.hasFocus === 'function' ? document.hasFocus() : null,
    isEmbedded: getIsEmbedded(),
    userActivationIsActive: userActivation?.isActive ?? null,
    userActivationHasBeenActive: userActivation?.hasBeenActive ?? null,
  };
}

async function reportFullscreenDenial(
  error: unknown,
  diagnostics: Omit<FullscreenDenialContext, 'fullscreenPermission'>,
): Promise<void> {
  const context: FullscreenDenialContext = {
    ...diagnostics,
    errorName: error instanceof Error ? error.name : null,
    errorMessage: error instanceof Error ? error.message : String(error),
    fullscreenPermission: await queryFullscreenPermission(),
  };

  const wrapped =
    error instanceof Error
      ? new Error(`requestFullscreen denied: ${error.message}`, { cause: error })
      : new Error('requestFullscreen denied');

  try {
    const logger = Logger.getInstance();
    logger.error(wrapped, context);
    logger.capture('Fullscreen request denied', context);
  } catch {
    console.warn('Fullscreen request denied', context);
  }
}

async function queryFullscreenPermission(): Promise<string | null> {
  try {
    const permissions = navigator.permissions;
    if (!permissions || typeof permissions.query !== 'function') return 'unavailable';
    const status = await permissions.query({ name: 'fullscreen' as PermissionName });
    return status.state;
  } catch {
    return 'unsupported';
  }
}

function getUserActivation(): UserActivation | null {
  try {
    return navigator.userActivation ?? null;
  } catch {
    return null;
  }
}

function getIsEmbedded(): boolean | null {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
