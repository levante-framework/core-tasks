import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMediaAssets, languageAudioFromStems, listLanguageAudio } from './getMediaAssets';

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('languageAudioFromStems', () => {
  it('keeps manifest names that exist and skips the rest', () => {
    const assets = languageAudioFromStems(
      'levante-assets-prod',
      'audio/es-CO',
      ['general-rotate-device', 'missing-clip', 'sdsFeedbackBothBlue'],
      new Set(['general-rotate-device', 'sdsFeedbackBothBlue']),
    );

    expect(assets.audio).toEqual({
      generalRotateDevice: 'https://storage.googleapis.com/levante-assets-prod/audio/es-CO/general-rotate-device.mp3',
      sdsFeedbackBothBlue: 'https://storage.googleapis.com/levante-assets-prod/audio/es-CO/sdsFeedbackBothBlue.mp3',
    });
    expect(assets.images).toEqual({});
    expect(assets.video).toEqual({});
  });

  it('intersects allowlist names with bucket stems', () => {
    const allowlist = ['intro-welcome', 'feedback-not-quite', 'ui-label-no-audio-file'];
    const bucketStems = new Set(['intro-welcome', 'feedback-not-quite']);

    const assets = languageAudioFromStems('levante-assets-prod', 'audio/en-US', allowlist, bucketStems);

    expect(assets.audio).toEqual({
      introWelcome: 'https://storage.googleapis.com/levante-assets-prod/audio/en-US/intro-welcome.mp3',
      feedbackNotQuite: 'https://storage.googleapis.com/levante-assets-prod/audio/en-US/feedback-not-quite.mp3',
    });
  });

  it('keeps manifest filenames that are not translation keys', () => {
    const assets = languageAudioFromStems(
      'levante-assets-prod',
      'audio/en-US',
      ['ChildSurveyIntro', 'same-different-selection-touch-circle', 'ToM-scene4-instruct1'],
      new Set(['ChildSurveyIntro', 'same-different-selection-touch-circle', 'ToM-scene4-instruct1']),
    );

    expect(assets.audio).toEqual({
      childSurveyIntro: 'https://storage.googleapis.com/levante-assets-prod/audio/en-US/ChildSurveyIntro.mp3',
      sameDifferentSelectionTouchCircle:
        'https://storage.googleapis.com/levante-assets-prod/audio/en-US/same-different-selection-touch-circle.mp3',
      toMScene4Instruct1: 'https://storage.googleapis.com/levante-assets-prod/audio/en-US/ToM-scene4-instruct1.mp3',
    });
  });
});

describe('listLanguageAudio', () => {
  it('reads mp3 names only and ignores the folder placeholder', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return jsonResponse({
        items: [{ name: 'audio/es-CO/' }, { name: 'audio/es-CO/coin.mp3' }, { name: 'audio/es-CO/notes.txt' }],
      });
    });

    const listing = await listLanguageAudio('levante-assets-prod/audio/es-CO');

    expect(urls[0]).toContain('fields=items(name),nextPageToken');
    expect(urls[0]).toContain('prefix=audio/es-CO/');
    expect(listing.folder).toBe('audio/es-CO');
    expect([...listing.stems]).toEqual(['coin']);
  });

  it('follows the next page token', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (!url.includes('pageToken=')) {
        return jsonResponse({
          items: [{ name: 'audio/de-DE/one.mp3' }],
          nextPageToken: 'page-2',
        });
      }
      return jsonResponse({ items: [{ name: 'audio/de-DE/two.mp3' }] });
    });

    const listing = await listLanguageAudio('levante-assets-prod/audio/de-DE');

    expect([...listing.stems]).toEqual(['one', 'two']);
  });
});

describe('getMediaAssets', () => {
  it('asks the list API for name and content type only', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return jsonResponse({
        items: [{ name: 'visual/vocab/album.webp', contentType: 'image/webp' }],
      });
    });

    const assets = await getMediaAssets('levante-assets-prod/visual/vocab', {}, 'vocab', 'es-CO');

    expect(urls[0]).toContain('fields=items(name,contentType),nextPageToken');
    expect(assets.images.album).toBe('https://storage.googleapis.com/levante-assets-prod/visual/vocab/album.webp');
  });
});
