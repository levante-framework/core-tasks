import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../../utils/logger';
import { getAssetsPerTask } from './getAssetsPerTask';
import { getTranslations } from './getTranslations';

const storeState: Record<string, unknown> = {};

vi.mock('../../../taskStore', () => {
  const taskStore = (key?: string | Record<string, unknown>, value?: unknown) => {
    if (key === undefined || typeof key === 'object') {
      return storeState;
    }
    if (value !== undefined) {
      storeState[key] = value;
      return value;
    }
    return storeState[key];
  };
  return { taskStore };
});

function stubFetchJson(data: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => data })),
  );
}

describe('helpers called by a launch that was aborted mid-request', () => {
  beforeEach(() => {
    for (const key of Object.keys(storeState)) {
      delete storeState[key];
    }
    Logger.resetInstance();
    Logger.setInstance(undefined, { taskName: 'vocab' } as GameParamsType, {} as UserParamsType);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getTranslations stores translations for a launch that is still active', async () => {
    stubFetchJson({ 'continue-button-text': 'Next' });
    await getTranslations(false, 'vocab', 'en-US', () => false);

    expect((storeState.translations as Record<string, string>).continueButtonText).toBe('Next');
  });

  it('getTranslations writes nothing when the launch is aborted before the download finishes', async () => {
    stubFetchJson({ 'continue-button-text': 'Next' });
    let aborted = false;
    const pending = getTranslations(false, 'vocab', 'en-US', () => aborted);
    aborted = true;
    await pending;

    expect(storeState.translations).toBeUndefined();
  });

  it('getAssetsPerTask stores the asset list for a launch that is still active', async () => {
    stubFetchJson({ shared: { audio: ['feedback-good-job'] } });
    await getAssetsPerTask(false, () => false);

    expect(storeState.assetsPerTask).toEqual({ shared: { audio: ['feedback-good-job'] } });
  });

  it('getAssetsPerTask writes nothing when the launch is aborted before the download finishes', async () => {
    stubFetchJson({ shared: { audio: ['feedback-good-job'] } });
    await getAssetsPerTask(false, () => true);

    expect(storeState.assetsPerTask).toBeUndefined();
  });
});
