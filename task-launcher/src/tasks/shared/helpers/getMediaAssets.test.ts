import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMediaAssets } from './getMediaAssets';

const listFields = 'fields=items(name,contentType),nextPageToken';

function jsonResponse(body: unknown) {
  return { json: async () => body };
}

describe('getMediaAssets', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('asks GCS for name and content type only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [{ name: 'audio/en-US/ChildSurveyIntro.mp3', contentType: 'audio/mpeg' }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const assets = await getMediaAssets('levante-assets-prod/audio/en-US', {}, 'en-US', 'vocab');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://storage.googleapis.com/storage/v1/b/levante-assets-prod/o?prefix=audio/en-US/&${listFields}`,
    );
    expect(assets.audio.childSurveyIntro).toBe(
      'https://storage.googleapis.com/levante-assets-prod/audio/en-US/ChildSurveyIntro.mp3',
    );
  });

  it('keeps the field mask when listing the next page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ name: 'visual/matrix-reasoning/item-1.webp', contentType: 'image/webp' }],
          nextPageToken: 'page-2',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ name: 'visual/matrix-reasoning/item-2.webp', contentType: 'image/webp' }],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const assets = await getMediaAssets('levante-assets-prod/visual/matrix-reasoning', {}, 'en-US', 'matrix-reasoning');

    expect(fetchMock.mock.calls[0][0]).toContain(listFields);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `https://storage.googleapis.com/storage/v1/b/levante-assets-prod/o?prefix=visual/matrix-reasoning/&${listFields}&pageToken=page-2`,
    );
    expect(assets.images.item1).toBe(
      'https://storage.googleapis.com/levante-assets-prod/visual/matrix-reasoning/item-1.webp',
    );
    expect(assets.images.item2).toBe(
      'https://storage.googleapis.com/levante-assets-prod/visual/matrix-reasoning/item-2.webp',
    );
  });

  it('keeps the field mask on the en-US audio fallback', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ name: 'audio/en/ClawIntro.mp3', contentType: 'audio/mpeg' }],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await getMediaAssets('levante-assets-prod/audio/en-US', {}, 'en-US', 'vocab');

    expect(fetchMock.mock.calls[1][0]).toBe(
      `https://storage.googleapis.com/storage/v1/b/levante-assets-prod/o?prefix=audio/en/&${listFields}`,
    );
  });
});
