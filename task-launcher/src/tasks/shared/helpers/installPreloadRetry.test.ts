import { afterEach, describe, expect, it, vi } from 'vitest';
import { installPreloadRetry, type PreloadApi } from './installPreloadRetry';

interface RecordedError {
  source?: string;
  error?: unknown;
}

function createApi(preload: PreloadApi['preloadImages']): PreloadApi {
  return {
    preloadImages: preload,
    preloadAudio: preload,
    preloadVideo: preload,
    cancelPreloads: vi.fn(),
  };
}

describe('installPreloadRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads each file once when the first request succeeds', () => {
    const loads: string[] = [];
    let completed = 0;
    const api = createApi((files, _complete, load) => {
      for (const file of files) load?.(file);
    });
    installPreloadRetry(api);

    api.preloadImages(
      ['https://cdn.example/a.png', 'https://cdn.example/b.png'],
      () => {
        completed += 1;
      },
      (file) => loads.push(file),
    );

    expect(loads).toEqual(['https://cdn.example/a.png', 'https://cdn.example/b.png']);
    expect(completed).toBe(1);
  });

  it('retries a dropped file and then reports success', async () => {
    vi.useFakeTimers();
    const seen: string[][] = [];
    const loads: string[] = [];
    const errors: RecordedError[] = [];
    const api = createApi((files, _complete, load, error) => {
      seen.push([...files]);
      for (const file of files) {
        if (seen.length === 1) error?.({ source: file, error: new Event('error') });
        else load?.(file);
      }
    });
    installPreloadRetry(api);

    api.preloadImages(
      ['https://cdn.example/a.png'],
      undefined,
      (file) => loads.push(file),
      (error) => errors.push(error),
    );

    expect(seen).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(seen).toHaveLength(2);
    expect(loads).toEqual(['https://cdn.example/a.png']);
    expect(errors).toEqual([]);
  });

  it('does not retry a missing file and ignores the duplicate error callback', () => {
    const seen: string[][] = [];
    const errors: RecordedError[] = [];
    const api = createApi((files, _complete, _load, error) => {
      seen.push([...files]);
      error?.({ source: files[0], error: '404' });
      error?.({ source: files[0], error: '404' });
    });
    installPreloadRetry(api);

    api.preloadAudio(['https://cdn.example/missing.mp3'], undefined, undefined, (error) => errors.push(error));

    expect(seen).toHaveLength(1);
    expect(errors).toEqual([{ source: 'https://cdn.example/missing.mp3', error: '404' }]);
  });

  it('stops after four failed attempts', async () => {
    vi.useFakeTimers();
    const seen: string[][] = [];
    const errors: RecordedError[] = [];
    const api = createApi((files, _complete, _load, error) => {
      seen.push([...files]);
      error?.({ source: files[0], error: new Event('error') });
    });
    installPreloadRetry(api);

    api.preloadVideo(['https://cdn.example/clip.mp4'], undefined, undefined, (error) => errors.push(error));
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000);

    expect(seen).toHaveLength(4);
    expect(errors).toHaveLength(1);
  });

  it('drops a scheduled retry when preloading is cancelled', async () => {
    vi.useFakeTimers();
    const seen: string[][] = [];
    const loads: string[] = [];
    const api = createApi((files, _complete, _load, error) => {
      seen.push([...files]);
      error?.({ source: files[0], error: new Event('error') });
    });
    const originalCancel = vi.fn();
    api.cancelPreloads = originalCancel;
    installPreloadRetry(api);

    api.preloadImages(['https://cdn.example/a.png'], undefined, (file) => loads.push(file));
    api.cancelPreloads();
    await vi.advanceTimersByTimeAsync(1000);

    expect(seen).toHaveLength(1);
    expect(loads).toEqual([]);
    expect(originalCancel).toHaveBeenCalledTimes(1);
  });

  it('loads a later batch after an earlier one was cancelled', async () => {
    vi.useFakeTimers();
    const loads: string[] = [];
    let attempt = 0;
    const api = createApi((files, _complete, load, error) => {
      attempt += 1;
      if (attempt === 1) error?.({ source: files[0], error: new Event('error') });
      else load?.(files[0]);
    });
    installPreloadRetry(api);

    api.preloadImages(['https://cdn.example/first.png']);
    api.cancelPreloads();
    api.preloadImages(['https://cdn.example/second.png'], undefined, (file) => loads.push(file));

    expect(loads).toEqual(['https://cdn.example/second.png']);
  });
});
