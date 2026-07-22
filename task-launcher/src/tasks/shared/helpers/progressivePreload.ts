import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { jsPsych } from '../../taskSetup';
import { batchMediaAssets } from './batchPreloading';
import { createPreloadTrials } from './createPreloadTrials';
import { filterMedia } from './filterMedia';
import { hideLevanteLogoLoading, showLevanteLogoLoading } from './loadingScreen';

/** jsPsych audio plugins still need a few per-file buffers. */
const PLUGIN_AUDIO_KEYS = ['select', 'coin', 'fail', 'inputAudioCue', 'nullAudio', 'pop'];

let bankPromise: Promise<void> | null = null;
let bankSettled = false;

/**
 * Instruction/practice trials for the launched variant.
 * Heavy variants use ipHeavy when present; otherwise fall back to ipLight.
 */
export function selectInstructionPracticeTrials(
  corpora: { ipLight: StimulusType[]; ipHeavy: StimulusType[] },
  heavyInstructions: boolean,
): StimulusType[] {
  if (heavyInstructions && corpora.ipHeavy.length > 0) return corpora.ipHeavy;
  return corpora.ipLight;
}

function markCriticalPack(partial: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __criticalPack?: Record<string, unknown> };
  w.__criticalPack = { ...(w.__criticalPack || {}), ...partial };
}

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

/**
 * Shared UI/feedback assets for the critical pack.
 * - URL heuristic: `/audio|visual/shared/` bucket paths
 * - Key list: `assetsPerTask.shared.audio` (language-bucket clips like feedbackGoodJob)
 */
function pickSharedAssets(mediaAssets: MediaAssetsType): MediaAssetsType {
  const pickByUrl = (map: Record<string, string>) =>
    Object.fromEntries(Object.entries(map).filter(([, url]) => isSharedAssetUrl(url)));

  const byUrl: MediaAssetsType = {
    images: pickByUrl(mediaAssets.images),
    audio: pickByUrl(mediaAssets.audio),
    video: pickByUrl(mediaAssets.video),
  };

  const sharedAudioKeys = taskStore().assetsPerTask?.shared?.audio ?? [];
  const bySharedKeys = filterMedia(mediaAssets, [], sharedAudioKeys, []);

  return mergeMedia(byUrl, bySharedKeys);
}

/**
 * Split media into a small critical pack (instructions/practice for the launched
 * variant) and the remaining bank. All videos go into critical (SDS demos are few);
 * plugin SFX + shared assets are always critical.
 */
export function partitionCriticalMedia(
  mediaAssets: MediaAssetsType,
  trials: StimulusType[],
  imageFields: string[],
  audioFields: string[] = ['audioFile'],
): { critical: MediaAssetsType; rest: MediaAssetsType } {
  const fromTrials =
    trials.length > 0 ? batchMediaAssets(mediaAssets, [trials], imageFields, audioFields)[0] : emptyMedia();

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

  markCriticalPack({ bankStartedAt: Date.now() });

  bankSettled = false;
  bankPromise = (async () => {
    try {
      await preloadWithPluginApi('images', Object.values(rest.images));
      await preloadWithPluginApi('audio', Object.values(rest.audio));
      await preloadWithPluginApi('video', Object.values(rest.video));
      markCriticalPack({ bankReadyAt: Date.now(), bankError: null });
    } catch (error) {
      console.warn('Background media bank preload failed', error);
      markCriticalPack({
        bankReadyAt: Date.now(),
        bankError: error instanceof Error ? error.message : String(error),
      });
    } finally {
      bankSettled = true;
    }
  })();

  return bankPromise;
}

/** Reset module state (tests / task re-entry). */
export function resetBackgroundBankLoad(): void {
  bankPromise = null;
  bankSettled = false;
  markCriticalPack({
    resetAt: Date.now(),
    criticalDoneAt: null,
    bankStartedAt: null,
    bankReadyAt: null,
    bankError: null,
  });
}

export function isBackgroundBankReady(): boolean {
  return bankSettled;
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
      if (isBackgroundBankReady()) {
        jsPsych.finishTrial({ backgroundBankReady: true, waitedForBank: false });
        return;
      }

      showLevanteLogoLoading();
      try {
        await awaitBackgroundBankLoad();
      } catch (error) {
        console.warn('Await background bank failed', error);
      } finally {
        hideLevanteLogoLoading();
      }
      jsPsych.finishTrial({ backgroundBankReady: true, waitedForBank: true });
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

  const { critical, rest } = partitionCriticalMedia(mediaAssets, criticalTrials, imageFields, audioFields);

  const criticalWithPlugins = withPluginAudio(critical, mediaAssets);

  const criticalTrial = createPreloadTrials(criticalWithPlugins).default;
  const previousOnFinish = criticalTrial.on_finish;
  criticalTrial.on_finish = (...args: unknown[]) => {
    markCriticalPack({ criticalDoneAt: Date.now() });
    if (typeof previousOnFinish === 'function') previousOnFinish(...args);
  };

  return [
    criticalTrial,
    createKickBackgroundBankTrial({
      rest: mergeMedia(rest, emptyMedia()),
    }),
  ];
}

/**
 * Thin CAT wiring: pick practice trials for the launched variant, then build
 * critical-pack preload + background bank kick trials.
 *
 * Optional `criticalTrials` overrides which media enter the critical pack
 * (e.g. math only needs the first instruction/practice block, not all later intros).
 */
export function createCatCriticalLaunch(
  mediaAssets: MediaAssetsType,
  options: {
    corpora: { ipLight: StimulusType[]; ipHeavy: StimulusType[] };
    heavyInstructions: boolean;
    imageFields: string[];
    audioFields?: string[];
    criticalTrials?: StimulusType[];
  },
): { instructionPractice: StimulusType[]; preloadTrials: Record<string, unknown>[] } {
  const { corpora, heavyInstructions, imageFields, audioFields = ['audioFile'], criticalTrials } = options;
  const instructionPractice = selectInstructionPracticeTrials(corpora, heavyInstructions);
  const criticalForPreload = criticalTrials ?? instructionPractice;
  markCriticalPack({
    heavyInstructions,
    usedHeavyPractice: heavyInstructions && corpora.ipHeavy.length > 0,
    ipLightCount: corpora.ipLight.length,
    ipHeavyCount: corpora.ipHeavy.length,
    instructionPracticeCount: instructionPractice.length,
    instructionPracticeIds: instructionPractice.map((t) => t.itemId).slice(0, 40),
    criticalTrialCount: criticalForPreload.length,
    criticalTrialIds: criticalForPreload.map((t) => t.itemId).slice(0, 40),
  });
  const preloadTrials = createProgressiveCatInitialPreload(mediaAssets, {
    criticalTrials: criticalForPreload,
    imageFields,
    audioFields,
  });
  return { instructionPractice, preloadTrials };
}
