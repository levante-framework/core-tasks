import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { jsPsych } from '../../taskSetup';
import { hasAudioSprites, loadAudioSprites } from './audioSprites';
import { createPreloadTrials } from './createPreloadTrials';

/** jsPsych audio plugins still need a few per-file buffers (not sprite offsets). */
const PLUGIN_AUDIO_KEYS = ['select', 'coin', 'fail', 'inputAudioCue', 'nullAudio', 'pop'];

function imagesAndPluginAudio(media: MediaAssetsType): MediaAssetsType {
  const audio: Record<string, string> = {};
  for (const key of PLUGIN_AUDIO_KEYS) {
    if (media.audio[key]) audio[key] = media.audio[key];
  }
  return {
    images: media.images,
    audio,
    video: media.video,
  };
}

/**
 * Preload trial that loads audio sprites (1–2 files) then finishes.
 */
export function createAudioSpriteLoadTrial(
  locale: string,
  task: string,
  enabled = true,
): Record<string, unknown> {
  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: '<div class="lev-stimulus-container"></div>',
    button_choices: [],
    keyboard_choices: 'NO_KEYS',
    trial_duration: null,
    response_ends_trial: false,
    on_load: async () => {
      try {
        await loadAudioSprites({ locale, task, enabled });
      } catch (error) {
        console.warn('Audio sprite load failed; falling back to per-file audio preload', error);
      }
      jsPsych.finishTrial({ spritesLoaded: hasAudioSprites() });
    },
  };
}

/**
 * Initial media preload for a task with optional audio sprites:
 * 1) Attempt sprite load for `task`
 * 2) If sprites ok: images + tiny plugin SFX set
 * 3) Else: full/fallback per-file audio preload
 */
export function createTaskSpriteInitialPreload(
  mediaAssets: MediaAssetsType,
  options: {
    locale: string;
    task: string;
    runCat: boolean;
    fallbackPreload: Record<string, unknown>;
    audioSpritesEnabled?: boolean;
  },
): Record<string, unknown>[] {
  const { locale, task, runCat, fallbackPreload, audioSpritesEnabled = true } = options;

  const imagePreload = createPreloadTrials(imagesAndPluginAudio(mediaAssets)).default;
  const fullOrFallback = runCat ? createPreloadTrials(mediaAssets).default : fallbackPreload;

  const spriteLoad = createAudioSpriteLoadTrial(locale, task, audioSpritesEnabled);

  const conditionalMediaPreload = {
    timeline: [imagePreload],
    conditional_function: () => hasAudioSprites(),
  };

  const conditionalFallbackPreload = {
    timeline: [fullOrFallback],
    conditional_function: () => !hasAudioSprites(),
  };

  return [spriteLoad, conditionalMediaPreload, conditionalFallbackPreload];
}

/** @deprecated Use createTaskSpriteInitialPreload */
export function createVocabInitialPreload(
  mediaAssets: MediaAssetsType,
  options: {
    locale: string;
    runCat: boolean;
    fallbackPreload: Record<string, unknown>;
    audioSpritesEnabled?: boolean;
  },
): Record<string, unknown>[] {
  return createTaskSpriteInitialPreload(mediaAssets, { ...options, task: 'vocab' });
}

/** Strip corpus audio from a batched media object when sprites are active (keep plugin SFX). */
export function stripAudioIfSprites(media: MediaAssetsType): MediaAssetsType {
  if (!hasAudioSprites()) return media;
  return imagesAndPluginAudio(media);
}
