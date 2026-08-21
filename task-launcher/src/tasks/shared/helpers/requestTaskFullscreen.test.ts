import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../../utils/logger';
import { requestTaskFullscreen } from './requestTaskFullscreen';

const requestFullscreen = vi.fn();
const requestFullscreenFunction = vi.fn(() => document.documentElement.requestFullscreen);

vi.mock('fscreen', () => ({
  default: {
    get fullscreenEnabled() {
      return true;
    },
    get fullscreenElement() {
      return null;
    },
    requestFullscreenFunction: (...args: unknown[]) => requestFullscreenFunction(...args),
    requestFullscreen: (...args: unknown[]) => requestFullscreen(...args),
  },
}));

function stubBrowserGlobals(overrides?: {
  isEmbedded?: boolean;
  permissionState?: PermissionState | Error;
  userActivation?: { isActive: boolean; hasBeenActive: boolean } | undefined;
}) {
  const permissionState = overrides?.permissionState ?? 'denied';
  const query = vi.fn().mockImplementation(async () => {
    if (permissionState instanceof Error) throw permissionState;
    return { state: permissionState };
  });

  const top = {};
  const selfWindow = overrides?.isEmbedded ? {} : top;

  vi.stubGlobal('document', {
    documentElement: { tagName: 'HTML', requestFullscreen },
    fullscreenEnabled: true,
    fullscreenElement: null,
    visibilityState: 'visible',
    hasFocus: () => true,
  });
  vi.stubGlobal('window', { self: selfWindow, top });
  vi.stubGlobal('navigator', {
    userActivation: overrides?.userActivation ?? { isActive: true, hasBeenActive: true },
    permissions: { query },
  });

  return { query };
}

describe('requestTaskFullscreen', () => {
  const levanteLogger = {
    capture: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    Logger.resetInstanceForTests();
    Logger.setInstance(levanteLogger, { taskName: 'memory-game' } as GameParamsType, {} as UserParamsType);
    requestFullscreen.mockReset();
    requestFullscreenFunction.mockReset();
    requestFullscreenFunction.mockImplementation(() => document.documentElement.requestFullscreen);
    levanteLogger.capture.mockReset();
    levanteLogger.error.mockReset();
    stubBrowserGlobals();
  });

  afterEach(() => {
    Logger.resetInstanceForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not call requestFullscreen when the API function is missing', () => {
    requestFullscreenFunction.mockReturnValue(
      undefined as unknown as typeof document.documentElement.requestFullscreen,
    );
    requestTaskFullscreen('enterFullscreen');
    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(levanteLogger.error).not.toHaveBeenCalled();
  });

  it('does not produce an unhandled rejection when requestFullscreen denies', async () => {
    requestFullscreen.mockImplementation(() => Promise.reject(new TypeError('Permissions check failed')));

    requestTaskFullscreen('enterFullscreen');
    await vi.waitFor(() => {
      expect(levanteLogger.error).toHaveBeenCalledTimes(1);
    });
    const [error, payload] = levanteLogger.error.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('requestFullscreen denied: Permissions check failed');
    expect(payload.context).toEqual(
      expect.objectContaining({
        source: 'enterFullscreen',
        errorName: 'TypeError',
        errorMessage: 'Permissions check failed',
        fullscreenEnabled: true,
        fscreenFullscreenEnabled: true,
        hasFullscreenElement: false,
        visibilityState: 'visible',
        hasFocus: true,
        isEmbedded: false,
        userActivationIsActive: true,
        userActivationHasBeenActive: true,
        fullscreenPermission: 'denied',
      }),
    );
    expect(levanteLogger.capture).toHaveBeenCalledWith(
      'Fullscreen request denied',
      expect.objectContaining({
        context: expect.objectContaining({ source: 'enterFullscreen', fullscreenPermission: 'denied' }),
      }),
    );
  });

  it('records unsupported when the fullscreen permission query throws', async () => {
    stubBrowserGlobals({ permissionState: new TypeError('not a valid permission') });
    requestFullscreen.mockImplementation(() => Promise.reject(new TypeError('Permissions check failed')));

    requestTaskFullscreen('utilityButton');
    await vi.waitFor(() => {
      expect(levanteLogger.error).toHaveBeenCalledTimes(1);
    });

    expect(levanteLogger.error.mock.calls[0][1].context).toEqual(
      expect.objectContaining({
        source: 'utilityButton',
        fullscreenPermission: 'unsupported',
      }),
    );
  });

  it('does not log when requestFullscreen succeeds', async () => {
    requestFullscreen.mockReturnValue(Promise.resolve());
    requestTaskFullscreen('enterFullscreen');
    await Promise.resolve();
    await Promise.resolve();
    expect(levanteLogger.error).not.toHaveBeenCalled();
    expect(levanteLogger.capture).not.toHaveBeenCalled();
  });
});
