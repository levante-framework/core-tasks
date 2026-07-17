import { mediaAssets } from '../../..';
import { jsPsych } from '../../taskSetup';
import { camelize } from './camelize';

export type SpriteClip = {
  buffer: AudioBuffer;
  start: number; // seconds
  duration: number; // seconds
};

/** Howler-compatible: { key: [startMs, durationMs] } */
type SpriteManifest = Record<string, [number, number]>;

const clips = new Map<string, SpriteClip>();
let urlToKey: Map<string, string> | null = null;
let spritesReady = false;

function getAssetsBucket(): string {
  const sample =
    Object.values(mediaAssets?.audio || {})[0] || Object.values(mediaAssets?.images || {})[0] || '';
  if (typeof sample === 'string' && sample.includes('levante-assets-dev')) {
    return 'levante-assets-dev';
  }
  return 'levante-assets-prod';
}

/** Prefer the media bucket; fall back to the other (sprites may only exist on prod). */
function getSpriteBucketCandidates(): string[] {
  const primary = getAssetsBucket();
  const secondary = primary === 'levante-assets-dev' ? 'levante-assets-prod' : 'levante-assets-dev';
  return [primary, secondary];
}

function localeAudioDirs(locale: string): string[] {
  if (locale === 'en-US' || locale === 'en') {
    return ['en', 'en-US'];
  }
  if (locale === 'de-DE' || locale === 'de') {
    return ['de', 'de-DE'];
  }
  return [locale];
}

function buildUrlToKeyMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, url] of Object.entries(mediaAssets?.audio || {})) {
    map.set(url, key);
  }
  return map;
}

function resolveKey(audioUriOrKey: string): string | null {
  if (!audioUriOrKey) return null;
  if (clips.has(audioUriOrKey)) return audioUriOrKey;

  if (!urlToKey) urlToKey = buildUrlToKeyMap();
  const fromUrl = urlToKey.get(audioUriOrKey);
  if (fromUrl && clips.has(fromUrl)) return fromUrl;

  // basename → camelKey (e.g. .../vocab-item-001.mp3)
  try {
    const base = decodeURIComponent(audioUriOrKey.split('/').pop() || '').replace(/\.[^.]+$/, '');
    const key = camelize(base);
    if (clips.has(key)) return key;
  } catch {
    // ignore
  }

  const camel = camelize(audioUriOrKey);
  if (clips.has(camel)) return camel;
  return null;
}

export function hasAudioSprites(): boolean {
  return spritesReady && clips.size > 0;
}

export function getSpriteClip(audioUriOrKey: string): SpriteClip | null {
  const key = resolveKey(audioUriOrKey);
  if (!key) return null;
  return clips.get(key) || null;
}

export function clearAudioSprites(): void {
  clips.clear();
  urlToKey = null;
  spritesReady = false;
}

async function fetchManifest(url: string): Promise<SpriteManifest | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as SpriteManifest;
  } catch {
    return null;
  }
}

async function fetchAndDecodeAudio(url: string, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    return null;
  }
}

async function loadOneSprite(
  baseUrl: string,
  name: string,
  ctx: BaseAudioContext,
): Promise<boolean> {
  const manifest = await fetchManifest(`${baseUrl}/${name}.json`);
  if (!manifest) return false;

  // Prefer m4a (iOS-friendly); fall back to mp3
  let buffer = await fetchAndDecodeAudio(`${baseUrl}/${name}.m4a`, ctx);
  if (!buffer) {
    buffer = await fetchAndDecodeAudio(`${baseUrl}/${name}.mp3`, ctx);
  }
  if (!buffer) return false;

  for (const [key, timing] of Object.entries(manifest)) {
    if (!Array.isArray(timing) || timing.length < 2) continue;
    const [startMs, durationMs] = timing;
    clips.set(key, {
      buffer,
      start: startMs / 1000,
      duration: durationMs / 1000,
    });
  }
  return true;
}

/**
 * Load task + shared audio sprites for the given locale.
 * Returns true if the task sprite loaded successfully.
 * Pass `enabled: false` (e.g. ?audioSprites=false) to force the legacy per-file path for A/B tests.
 */
export async function loadAudioSprites(options: {
  locale: string;
  task?: string;
  enabled?: boolean;
}): Promise<boolean> {
  const { locale, task = 'vocab', enabled = true } = options;
  clearAudioSprites();

  if (!enabled) {
    return false;
  }

  const ctx = jsPsych.pluginAPI.audioContext() as BaseAudioContext;
  if (!ctx) return false;

  let taskLoaded = false;

  for (const bucket of getSpriteBucketCandidates()) {
    // Shared is best-effort (dings, UI prompts); task sprite is required to skip per-file preload
    await loadOneSprite(`https://storage.googleapis.com/${bucket}/audio/shared/sprites`, 'shared', ctx);

    for (const dir of localeAudioDirs(locale)) {
      const ok = await loadOneSprite(
        `https://storage.googleapis.com/${bucket}/audio/${dir}/sprites`,
        task,
        ctx,
      );
      if (ok) {
        taskLoaded = true;
        break;
      }
    }
    if (taskLoaded) break;
  }

  spritesReady = taskLoaded;
  urlToKey = buildUrlToKeyMap();
  return taskLoaded;
}
