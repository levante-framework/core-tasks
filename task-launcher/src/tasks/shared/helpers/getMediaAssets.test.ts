import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMediaAssets } from './getMediaAssets';

function jsonResponse(body: unknown) {
  return Promise.resolve({
    json: () => Promise.resolve(body),
  } as Response);
}

describe('getMediaAssets audio locale fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back from empty audio/es to audio/es-CO', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes('prefix=audio/es-CO/')) {
        return jsonResponse({
          items: [{ name: 'audio/es-CO/hearts-and-flowers-instruct.mp3', contentType: 'audio/mpeg' }],
        });
      }
      return jsonResponse({ items: [] });
    });
    vi.stubGlobal('fetch', fetchMock);

    const assets = await getMediaAssets('levante-assets-prod/audio/es', {}, 'es', 'hearts-and-flowers');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('prefix=audio/es-CO/');
    expect(assets.audio.heartsAndFlowersInstruct).toContain('audio/es-CO/hearts-and-flowers-instruct.mp3');
  });

  it('falls back from empty audio/es-US to audio/es-CO', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes('prefix=audio/es-CO/')) {
        return jsonResponse({
          items: [{ name: 'audio/es-CO/hearts-and-flowers-instruct.mp3', contentType: 'audio/mpeg' }],
        });
      }
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);

    const assets = await getMediaAssets('levante-assets-prod/audio/es-US', {}, 'es-US', 'hearts-and-flowers');

    expect(String(fetchMock.mock.calls[1][0])).toContain('prefix=audio/es-CO/');
    expect(assets.audio.heartsAndFlowersInstruct).toContain('audio/es-CO/hearts-and-flowers-instruct.mp3');
  });

  it('keeps the en-US to en fallback', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes('prefix=audio/en/')) {
        return jsonResponse({
          items: [{ name: 'audio/en/hearts-and-flowers-instruct.mp3', contentType: 'audio/mpeg' }],
        });
      }
      return jsonResponse({ items: [] });
    });
    vi.stubGlobal('fetch', fetchMock);

    const assets = await getMediaAssets('levante-assets-prod/audio/en-US', {}, 'en-US', 'hearts-and-flowers');

    expect(String(fetchMock.mock.calls[1][0])).toContain('prefix=audio/en/');
    expect(assets.audio.heartsAndFlowersInstruct).toContain('audio/en/hearts-and-flowers-instruct.mp3');
  });

  it('does not throw when the prefix is empty and has no fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({})),
    );

    const assets = await getMediaAssets('levante-assets-prod/audio/nl-NL', {}, 'nl-NL', 'hearts-and-flowers');

    expect(assets).toEqual({ images: {}, audio: {}, video: {} });
  });
});
