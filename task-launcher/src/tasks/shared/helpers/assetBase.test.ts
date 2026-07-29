import { afterEach, describe, expect, it } from 'vitest';
import {
  getAssetBaseUrl,
  isOfflineAssets,
  resolveAssetsRootUrl,
  resolveBucketFileUrl,
  resolveListUrl,
  resolveObjectUrl,
  setAssetBaseUrl,
} from './assetBase';

describe('assetBase', () => {
  afterEach(() => {
    setAssetBaseUrl(null);
  });

  it('defaults to GCS object and list URLs', () => {
    expect(isOfflineAssets()).toBe(false);
    expect(resolveObjectUrl('levante-assets-prod', 'audio/zh-CN/hello.mp3')).toBe(
      'https://storage.googleapis.com/levante-assets-prod/audio/zh-CN/hello.mp3',
    );
    expect(resolveListUrl('levante-assets-prod', 'audio/zh-CN')).toBe(
      'https://storage.googleapis.com/storage/v1/b/levante-assets-prod/o?prefix=audio/zh-CN/',
    );
    expect(resolveBucketFileUrl('levante-assets-prod/corpus/egma-math', 'math-item-bank.csv')).toBe(
      'https://storage.googleapis.com/levante-assets-prod/corpus/egma-math/math-item-bank.csv?alt=media&v=3',
    );
    expect(resolveAssetsRootUrl(false, 'audio/assets-per-task.json')).toBe(
      'https://storage.googleapis.com/levante-assets-prod/audio/assets-per-task.json',
    );
  });

  it('rewrites URLs when assetBaseUrl is set', () => {
    setAssetBaseUrl('http://127.0.0.1:4173/assets/');
    expect(getAssetBaseUrl()).toBe('http://127.0.0.1:4173/assets');
    expect(isOfflineAssets()).toBe(true);
    expect(resolveObjectUrl('levante-assets-prod', 'visual/hearts-and-flowers/icon.png')).toBe(
      'http://127.0.0.1:4173/assets/visual/hearts-and-flowers/icon.png',
    );
    expect(resolveListUrl('levante-assets-prod', 'visual/hearts-and-flowers')).toBe(
      'http://127.0.0.1:4173/assets/manifests/visual/hearts-and-flowers.json',
    );
    expect(resolveBucketFileUrl('levante-assets-prod/corpus/egma-math', 'math-item-bank.csv')).toBe(
      'http://127.0.0.1:4173/assets/corpus/egma-math/math-item-bank.csv',
    );
    expect(resolveAssetsRootUrl(true, 'translations/itembank/general/zh-CN/item-bank-translations.json')).toBe(
      'http://127.0.0.1:4173/assets/translations/itembank/general/zh-CN/item-bank-translations.json',
    );
  });
});
