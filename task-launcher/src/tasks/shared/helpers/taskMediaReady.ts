import { Logger } from '../../../utils/logger';

export interface MediaResourceEntry {
  name: string;
  startTime: number;
  responseEnd: number;
  duration: number;
}

export interface MediaReadySummary {
  audioCount: number;
  imageCount: number;
  videoCount: number;
  downloadSpanMs: number;
  slowestMs: number;
}

let launchedAtMs: number | null = null;
let reported = false;
let launchedTaskName = '';
let launchedLanguage = '';

function mediaKind(name: string) {
  const path = name.split('?')[0].toLowerCase();
  if (/\.(mp3|wav|ogg|m4a)$/.test(path)) return 'audio';
  if (/\.(png|webp|jpe?g|gif|svg)$/.test(path)) return 'image';
  if (/\.(mp4|webm|ogv)$/.test(path)) return 'video';
  return null;
}

export function summarizeMediaResources(entries: MediaResourceEntry[], sinceMs: number): MediaReadySummary {
  const media = entries.filter((entry) => entry.startTime >= sinceMs && mediaKind(entry.name));
  const summary: MediaReadySummary = {
    audioCount: 0,
    imageCount: 0,
    videoCount: 0,
    downloadSpanMs: 0,
    slowestMs: 0,
  };
  if (media.length === 0) return summary;

  let earliest = Number.POSITIVE_INFINITY;
  let latest = 0;
  for (const entry of media) {
    const kind = mediaKind(entry.name);
    if (kind === 'audio') summary.audioCount += 1;
    if (kind === 'image') summary.imageCount += 1;
    if (kind === 'video') summary.videoCount += 1;
    const end = entry.responseEnd > entry.startTime ? entry.responseEnd : entry.startTime + entry.duration;
    if (entry.startTime < earliest) earliest = entry.startTime;
    if (end > latest) latest = end;
    if (entry.duration > summary.slowestMs) summary.slowestMs = entry.duration;
  }
  summary.downloadSpanMs = Math.max(0, Math.round(latest - earliest));
  summary.slowestMs = Math.round(summary.slowestMs);
  return summary;
}

function readResourceEntries(): MediaResourceEntry[] {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return [];
  return performance.getEntriesByType('resource').map((entry) => {
    const resource = entry as PerformanceResourceTiming;
    return {
      name: resource.name,
      startTime: resource.startTime,
      responseEnd: resource.responseEnd ?? 0,
      duration: resource.duration ?? 0,
    };
  });
}

export function markTaskLaunched(taskName: string, language: string, nowMs = performance.now()) {
  launchedAtMs = nowMs;
  reported = false;
  launchedTaskName = taskName;
  launchedLanguage = language;
}

export function reportTaskMediaReady(nowMs = performance.now(), entries = readResourceEntries()) {
  if (reported || launchedAtMs == null) return;
  reported = true;
  const readyMs = Math.max(0, Math.round(nowMs - launchedAtMs));
  const summary = summarizeMediaResources(entries, launchedAtMs);
  try {
    Logger.getInstance().capture('Task media ready', {
      taskName: launchedTaskName,
      language: launchedLanguage,
      readyMs,
      ...summary,
    });
  } catch {
    return;
  }
}
