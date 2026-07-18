import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { jsPsych } from '../../taskSetup';
import { batchMediaAssets } from './batchPreloading';
import { createPreloadTrials } from './createPreloadTrials';
import { filterMedia } from './filterMedia';

/** jsPsych audio plugins still need a few per-file buffers. */
const PLUGIN_AUDIO_KEYS = ['select', 'coin', 'fail', 'inputAudioCue', 'nullAudio', 'pop'];

let bankPromise: Promise<void> | null = null;

function emptyMedia(): MediaAssetsType {
  return { images: {}, audio: {}, video: {} };
}

function mergeMedia(a: MediaAssetsType, b: MediaAssetsType): MediaAssetsType {
  return {
    images: { ...a.images, ...b.images },
    audio: { ...a.audio, ...b.audio },
    video: { ...a.video, ...b.video },
  };
}

function withPluginAudio(media: MediaAssetsType, source: MediaAssetsType): MediaAssetsType {
  const audio = { ...media.audio };
  for (const key of PLUGIN_AUDIO_KEYS) {
    if (source.audio[key]) audio[key] = source.audio[key];
  }
  return { ...media, audio };
}

function isSharedAssetUrl(url: string): boolean {
  return /\/(?:audio|visual)\/shared\//.test(url);
}

function pickSharedAssets(mediaAssets: MediaAssetsType): MediaAssetsType {
  const pick = (map: Record<string, string>) =>
    Object.fromEntries(Object.entries(map).filter(([, url]) => isSharedAssetUrl(url)));
  return {
    images: pick(mediaAssets.images),
    audio: pick(mediaAssets.audio),
    video: pick(mediaAssets.video),
  };
}

/**
 * Split media into a small critical pack (instructions/practice) and the remaining bank.
 * All videos go into critical (SDS demos are few); plugin SFX + shared assets are always critical.
 */
export function partitionCriticalMedia(
  mediaAssets: MediaAssetsType,
  trials: StimulusType[],
  imageFields: string[],
  audioFields: string[] = ['audioFile'],
): { critical: MediaAssetsType; rest: MediaAssetsType } {
  const fromTrials =
    trials.length > 0
      ? batchMediaAssets(mediaAssets, [trials], imageFields, audioFields)[0]
      : emptyMedia();

  let critical = withPluginAudio(mergeMedia(fromTrials, pickSharedAssets(mediaAssets)), mediaAssets);
  // Demo / instruction videos are few; keep them on the launch path.
  critical = {
    ...critical,
    video: { ...mediaAssets.video },
  };

  const rest = filterMedia(
    mediaAssets,
    Object.keys(mediaAssets.images).filter((k) => !critical.images[k]),
    Object.keys(mediaAssets.audio).filter((k) => !critical.audio[k]),
    Object.keys(mediaAssets.video).filter((k) => !critical.video[k]),
  );

  return { critical, rest };
}

function preloadWithPluginApi(kind: 'images' | 'audio' | 'video', urls: string[]): Promise<void> {
  if (!urls.length) return Promise.resolve();
  const api = jsPsych.pluginAPI as {
    preloadImages?: (files: string[], callback: () => void) => void;
    preloadAudio?: (files: string[], callback: () => void) => void;
    preloadVideo?: (files: string[], callback: () => void) => void;
  };
  return new Promise((resolve) => {
    const done = () => resolve();
    try {
      if (kind === 'images' && api.preloadImages) {
        api.preloadImages(urls, done);
        return;
      }
      if (kind === 'audio' && api.preloadAudio) {
        api.preloadAudio(urls, done);
        return;
      }
      if (kind === 'video' && api.preloadVideo) {
        api.preloadVideo(urls, done);
        return;
      }
    } catch (error) {
      console.warn(`Background ${kind} preload failed`, error);
    }
    // Fallback: best-effort fetch so we still warm HTTP cache.
    Promise.all(
      urls.map((url) =>
        fetch(url)
          .then((r) => r.arrayBuffer())
          .catch(() => null),
      ),
    ).then(() => done());
  });
}

/**
 * Start loading remaining images/audio/video (non-blocking).
 * Safe to call multiple times; returns the same Promise.
 */
export function startBackgroundBankLoad(options: { rest: MediaAssetsType }): Promise<void> {
  if (bankPromise) return bankPromise;

  const { rest } = options;

  bankPromise = (async () => {
    try {
      await preloadWithPluginApi('images', Object.values(rest.images));
      await preloadWithPluginApi('audio', Object.values(rest.audio));
      await preloadWithPluginApi('video', Object.values(rest.video));
    } catch (error) {
      console.warn('Background media bank preload failed', error);
    }
  })();

  return bankPromise;
}

/** Reset module state (tests / task re-entry). */
export function resetBackgroundBankLoad(): void {
  bankPromise = null;
}

export async function awaitBackgroundBankLoad(): Promise<void> {
  if (!bankPromise) return;
  await bankPromise;
}

export function createKickBackgroundBankTrial(options: { rest: MediaAssetsType }): Record<string, unknown> {
  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: '<div class="lev-stimulus-container"></div>',
    button_choices: [],
    keyboard_choices: 'NO_KEYS',
    trial_duration: null,
    response_ends_trial: false,
    on_load: () => {
      startBackgroundBankLoad(options);
      jsPsych.finishTrial({ backgroundBankStarted: true });
    },
  };
}

export function createAwaitBackgroundBankTrial(): Record<string, unknown> {
  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: '<div class="lev-stimulus-container"></div>',
    button_choices: [],
    keyboard_choices: 'NO_KEYS',
    trial_duration: null,
    response_ends_trial: false,
    on_load: async () => {
      try {
        await awaitBackgroundBankLoad();
      } catch (error) {
        console.warn('Await background bank failed', error);
      }
      jsPsych.finishTrial({ backgroundBankReady: true });
    },
  };
}

/**
 * CAT launch path: block only on instructions/practice media, then kick bank load.
 * Insert createAwaitBackgroundBankTrial() before the first scored items.
 */
export function createProgressiveCatInitialPreload(
  mediaAssets: MediaAssetsType,
  options: {
    criticalTrials: StimulusType[];
    imageFields: string[];
    audioFields?: string[];
  },
): Record<string, unknown>[] {
  const { criticalTrials, imageFields, audioFields = ['audioFile'] } = options;

  resetBackgroundBankLoad();

  const { critical, rest } = partitionCriticalMedia(
    mediaAssets,
    criticalTrials,
    imageFields,
    audioFields,
  );

  const criticalWithPlugins = withPluginAudio(critical, mediaAssets);

  return [
    createPreloadTrials(criticalWithPlugins).default,
    createKickBackgroundBankTrial({
      rest: mergeMedia(rest, emptyMedia()),
    }),
  ];
}
