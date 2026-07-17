#!/usr/bin/env node
/**
 * Build audio sprites for task audio (+ shared) from GCS clips.
 *
 * Collapses many small mp3s into one file + JSON manifest of
 * { camelKey: [startMs, durationMs] } (Howler-compatible).
 *
 * Usage:
 *   node scripts/build-audio-sprites.mjs --env prod --locale en
 *   node scripts/build-audio-sprites.mjs --env prod --locale en --upload
 *
 * Requires: ffmpeg, ffprobe. Upload requires gsutil.
 *
 * Outputs (under --out, default ./sprite-build):
 *   audio/{locale}/sprites/{task}.m4a + {task}.json
 *     (task clips + shared prompt names from the locale folder)
 *   audio/shared/sprites/shared.m4a + shared.json
 *     (SFX that live under audio/shared/: coin, inputAudioCue, …)
 *
 *   --tasks vocab,same-different-selection,shared
 *
 * Upload (from the output directory so paths match the bucket layout):
 *   cd sprite-build && gsutil -m cp -r audio gs://levante-assets-{env}/
 *
 * Example:
 *   npm run build:audio-sprites -- --env prod --locale en
 *   npm run build:audio-sprites:upload -- --env prod --locale en
 */

import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Match task-launcher camelize (kebab/snake → camelCase). */
function camelize(string) {
  return string.replace(/^([A-Z])|[\s-_](\w)/g, (_0, p1, p2) => {
    if (p2) return p2.toUpperCase();
    return p1.toLowerCase();
  });
}

function parseArgs(argv) {
  const args = {
    env: 'prod',
    locale: 'en',
    out: join(__dirname, '..', 'sprite-build'),
    gapMs: 80,
    upload: false,
    tasks: ['vocab', 'shared'],
    maxClips: 0, // 0 = all
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--env') args.env = argv[++i];
    else if (a === '--locale') args.locale = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--gap-ms') args.gapMs = Number(argv[++i]);
    else if (a === '--max-clips') args.maxClips = Number(argv[++i]);
    else if (a === '--tasks') {
      args.tasks = String(argv[++i])
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (a === '--upload') args.upload = true;
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace('/**', '').trim());
      process.exit(0);
    }
  }
  if (!['dev', 'prod'].includes(args.env)) {
    throw new Error(`--env must be dev or prod, got ${args.env}`);
  }
  return args;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function ensureBinaries() {
  for (const bin of ['ffmpeg', 'ffprobe']) {
    const check = spawnSync(bin, ['-version'], { encoding: 'utf8' });
    if (check.status !== 0) {
      throw new Error(`${bin} is required but not found on PATH`);
    }
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function downloadFile(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

function probeDurationMs(filePath) {
  const out = run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const sec = Number.parseFloat(out.trim());
  if (!Number.isFinite(sec)) throw new Error(`Could not probe duration: ${filePath}`);
  return Math.round(sec * 1000);
}

function makeSilence(dest, gapMs, sampleRate = 44100) {
  mkdirSync(dirname(dest), { recursive: true });
  run('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `anullsrc=r=${sampleRate}:cl=mono`,
    '-t',
    (gapMs / 1000).toFixed(3),
    dest,
  ]);
}

function convertToWav(src, dest, sampleRate = 44100) {
  run('ffmpeg', ['-y', '-i', src, '-ac', '1', '-ar', String(sampleRate), dest]);
}

function concatWavs(listFile, dest) {
  run('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listFile,
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    dest,
  ]);
}

async function listLocaleAudioFiles(bucket, locale) {
  const prefixes = locale === 'en-US' ? ['audio/en-US/', 'audio/en/'] : [`audio/${locale}/`];
  const byBase = new Map();
  for (const prefix of prefixes) {
    let pageToken = '';
    do {
      const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);
      url.searchParams.set('prefix', prefix);
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const data = await fetchJson(url.toString());
      for (const item of data.items || []) {
        if (!item.contentType?.startsWith('audio/')) continue;
        const parts = item.name.split('/');
        // audio/{locale}/file.ext only (skip nested e.g. sprites/)
        if (parts.length !== 3) continue;
        const base = parts[2].replace(/\.[^.]+$/, '');
        if (!byBase.has(base)) {
          byBase.set(base, item.name);
        }
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    if (byBase.size > 0) break;
  }
  return byBase;
}

async function listSharedAudioFiles(bucket) {
  const byBase = new Map();
  let pageToken = '';
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);
    url.searchParams.set('prefix', 'audio/shared/');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await fetchJson(url.toString());
    for (const item of data.items || []) {
      if (!item.contentType?.startsWith('audio/')) continue;
      const parts = item.name.split('/');
      if (parts.length !== 3) continue;
      const base = parts[2].replace(/\.[^.]+$/, '');
      if (!byBase.has(base)) byBase.set(base, item.name);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return byBase;
}

async function buildSprite({
  bucket,
  assetNames,
  fileMap,
  outAudioPath,
  outJsonPath,
  workDir,
  gapMs,
  label,
}) {
  mkdirSync(workDir, { recursive: true });
  const silencePath = join(workDir, 'silence.wav');
  makeSilence(silencePath, gapMs);

  const manifest = {};
  const concatLines = [];
  let offsetMs = 0;
  let missing = 0;

  for (const name of assetNames) {
    const objectPath = fileMap.get(name);
    if (!objectPath) {
      console.warn(`[${label}] missing source file for asset "${name}"`);
      missing++;
      continue;
    }
    const url = `https://storage.googleapis.com/${bucket}/${objectPath}`;
    const ext = objectPath.split('.').pop() || 'mp3';
    const rawPath = join(workDir, `${name}.${ext}`);
    const wavPath = join(workDir, `${name}.wav`);
    process.stdout.write(`[${label}] download ${name}\r`);
    await downloadFile(url, rawPath);
    convertToWav(rawPath, wavPath);
    const durationMs = probeDurationMs(wavPath);
    const key = camelize(name);
    manifest[key] = [offsetMs, durationMs];
    // Absolute paths: concat demuxer resolves relative to the list file
    const absWav = resolve(wavPath).replace(/'/g, "'\\''");
    const absSilence = resolve(silencePath).replace(/'/g, "'\\''");
    concatLines.push(`file '${absWav}'`);
    concatLines.push(`file '${absSilence}'`);
    offsetMs += durationMs + gapMs;
  }
  process.stdout.write('\n');

  if (Object.keys(manifest).length === 0) {
    throw new Error(`[${label}] no clips found to sprite`);
  }

  const listFile = join(workDir, 'concat.txt');
  writeFileSync(listFile, `${concatLines.join('\n')}\n`);
  mkdirSync(dirname(outAudioPath), { recursive: true });
  concatWavs(listFile, outAudioPath);
  writeFileSync(outJsonPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    `[${label}] wrote ${outAudioPath} + ${outJsonPath} (${Object.keys(manifest).length} clips, ${missing} missing)`,
  );
}

async function main() {
  ensureBinaries();
  const args = parseArgs(process.argv.slice(2));
  const bucket = `levante-assets-${args.env}`;
  const assetsPerTask = await fetchJson(`https://storage.googleapis.com/${bucket}/audio/assets-per-task.json`);

  const localeFiles = await listLocaleAudioFiles(bucket, args.locale);
  const sharedFiles = await listSharedAudioFiles(bucket);

  // Prefer en/ for English primary (matches bucket fallback in getMediaAssets)
  const effectiveLocaleDir = args.locale.startsWith('en') ? 'en' : args.locale;
  const taskSpriteDir = join(args.out, 'audio', effectiveLocaleDir, 'sprites');
  const sharedSpriteDir = join(args.out, 'audio', 'shared', 'sprites');

  // Locale-folder tasks: task clips + shared prompt names (assets-per-task.shared.*)
  const localeTasks = args.tasks.filter((t) => t !== 'shared');
  for (const taskName of localeTasks) {
    const taskNames = assetsPerTask[taskName]?.audio || [];
    const sharedPromptNames = assetsPerTask.shared?.audio || [];
    if (!taskNames.length) throw new Error(`assets-per-task.json missing ${taskName}.audio`);
    let names = [...new Set([...taskNames, ...sharedPromptNames])];
    if (args.maxClips > 0) names = names.slice(0, args.maxClips);
    await buildSprite({
      bucket,
      assetNames: names,
      fileMap: localeFiles,
      outAudioPath: join(taskSpriteDir, `${taskName}.m4a`),
      outJsonPath: join(taskSpriteDir, `${taskName}.json`),
      workDir: join(args.out, '.work', taskName),
      gapMs: args.gapMs,
      label: taskName,
    });
  }

  if (args.tasks.includes('shared')) {
    // Sprite whatever actually lives under audio/shared/
    let names = [...sharedFiles.keys()];
    if (!names.length) throw new Error('No audio files found under audio/shared/');
    if (args.maxClips > 0) names = names.slice(0, args.maxClips);
    await buildSprite({
      bucket,
      assetNames: names,
      fileMap: sharedFiles,
      outAudioPath: join(sharedSpriteDir, 'shared.m4a'),
      outJsonPath: join(sharedSpriteDir, 'shared.json'),
      workDir: join(args.out, '.work', 'shared'),
      gapMs: args.gapMs,
      label: 'shared',
    });
  }

  console.log(`\nDone. Output under ${args.out}`);
  console.log('Upload to GCS (from output dir):');
  console.log(`  cd ${args.out} && gsutil -m cp -r audio gs://${bucket}/`);

  if (args.upload) {
    if (!existsSync(join(args.out, 'audio'))) {
      throw new Error('Nothing to upload');
    }
    run('gsutil', ['-m', 'cp', '-r', 'audio', `gs://${bucket}/`], { cwd: args.out, stdio: 'inherit' });
    console.log('Upload complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
