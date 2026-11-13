const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 1000;

interface PreloadError {
  source?: string;
  error?: unknown;
}

type PreloadMethod = (
  files: string[],
  callbackComplete?: () => void,
  callbackLoad?: (filepath: string) => void,
  callbackError?: (error: PreloadError) => void,
) => void;

export interface PreloadApi {
  preloadImages: PreloadMethod;
  preloadAudio: PreloadMethod;
  preloadVideo: PreloadMethod;
  cancelPreloads: () => void;
}

function fileList(files: string[]): string[] {
  return [...new Set(files.flat().filter((file) => typeof file === 'string' && file.length > 0))];
}

function isMissingAsset(error: PreloadError): boolean {
  const inner = error.error;
  if (inner === '404' || inner === 404) return true;
  if (typeof inner === 'object' && inner !== null && 'status' in inner) {
    return Number((inner as { status: unknown }).status) === 404;
  }
  return false;
}

function wrapPreload(
  original: PreloadMethod,
  getGeneration: () => number,
  schedule: (fn: () => void, ms: number) => void,
) {
  return (
    files: string[],
    callbackComplete?: () => void,
    callbackLoad?: (filepath: string) => void,
    callbackError?: (error: PreloadError) => void,
  ) => {
    const activeGeneration = getGeneration();
    const isCurrent = () => getGeneration() === activeGeneration;
    const expected = fileList(files);
    if (expected.length === 0) {
      callbackComplete?.();
      return;
    }

    const settled = new Set<string>();
    const attempts = new Map<string, number>();
    const currentAttempt = new Map<string, number>();
    let nextAttemptId = 0;

    const finish = (src: string) => {
      settled.add(src);
      currentAttempt.set(src, -1);
      if (settled.size === expected.length) callbackComplete?.();
    };

    const begin = (pending: string[]) => {
      const ids = new Map<string, number>();
      for (const src of pending) {
        const id = nextAttemptId++;
        ids.set(src, id);
        currentAttempt.set(src, id);
      }

      original(
        pending,
        () => {},
        (loaded) => {
          if (!isCurrent() || currentAttempt.get(loaded) !== ids.get(loaded) || settled.has(loaded)) return;
          callbackLoad?.(loaded);
          finish(loaded);
        },
        (error) => {
          const src = error.source;
          if (!src || !isCurrent() || currentAttempt.get(src) !== ids.get(src) || settled.has(src)) return;
          currentAttempt.set(src, -1);
          const attempt = (attempts.get(src) ?? 0) + 1;
          attempts.set(src, attempt);
          if (!isMissingAsset(error) && attempt < MAX_ATTEMPTS) {
            schedule(
              () => {
                if (!isCurrent() || settled.has(src)) return;
                begin([src]);
              },
              BASE_DELAY_MS * 2 ** (attempt - 1),
            );
            return;
          }
          callbackError?.(error);
          finish(src);
        },
      );
    };

    begin(expected);
  };
}

export function installPreloadRetry(pluginApi: PreloadApi) {
  let generation = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const schedule = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };

  const originalCancel = pluginApi.cancelPreloads.bind(pluginApi);
  pluginApi.cancelPreloads = () => {
    generation += 1;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    originalCancel();
  };

  const methods = ['preloadImages', 'preloadAudio', 'preloadVideo'] as const;
  for (const method of methods) {
    const original = pluginApi[method].bind(pluginApi);
    pluginApi[method] = wrapPreload(original, () => generation, schedule);
  }
}
