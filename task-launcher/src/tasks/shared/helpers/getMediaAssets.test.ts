import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAssetBaseUrl } from './assetBase';
import { getMediaAssets } from './getMediaAssets';

describe('getMediaAssets offline manifests', () => {
  afterEach(() => {
    setAssetBaseUrl(null);
    vi.unstubAllGlobals();
  });

  it('loads categorized assets from local manifests', async () => {
    setAssetBaseUrl('/assets');
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('/assets/manifests/visual/hearts-and-flowers.json');
      return {
        ok: true,
        json: async () => ({
          items: [
            { name: 'visual/hearts-and-flowers/heart.png', contentType: 'image/png' },
            { name: 'visual/other-task/skip.png', contentType: 'image/png' },
          ],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const assets = await getMediaAssets(
      'levante-assets-prod/visual/hearts-and-flowers',
      {},
      'zh-CN',
      'hearts-and-flowers',
    );

    expect(assets.images.heart).toBe('/assets/visual/hearts-and-flowers/heart.png');
    expect(assets.images.skip).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
