import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRequiredAudioNames } from './getAssetsPerTask';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getRequiredAudioNames', () => {
  it('returns the task list plus shared audio, including clips that are not translation keys', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      expect(url).toBe('https://storage.googleapis.com/levante-assets-prod/audio/assets-per-task.json');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          'same-different-selection': { audio: ['same-different-selection-touch-circle'] },
          shared: { audio: ['general-rotate-device'] },
        }),
      };
    });

    const names = await getRequiredAudioNames(false, 'same-different-selection');

    expect(names).toEqual(['same-different-selection-touch-circle', 'general-rotate-device']);
  });

  it('throws when the manifest has no list for the task', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ shared: { audio: [] } }),
    }));

    await expect(getRequiredAudioNames(false, 'vocab')).rejects.toThrow('No audio list for task vocab');
  });
});
