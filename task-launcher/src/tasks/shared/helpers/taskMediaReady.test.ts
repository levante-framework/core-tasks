import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../../utils/logger';
import { markTaskLaunched, reportTaskMediaReady, summarizeMediaResources } from './taskMediaReady';

describe('summarizeMediaResources', () => {
  it('counts media that started after launch and ignores everything else', () => {
    const summary = summarizeMediaResources(
      [
        {
          name: 'https://storage.googleapis.com/bucket/audio/en-US/coin.mp3',
          startTime: 900,
          responseEnd: 1100,
          duration: 200,
        },
        {
          name: 'https://storage.googleapis.com/bucket/visual/vocab/arm.webp?alt=media',
          startTime: 1000,
          responseEnd: 1500,
          duration: 500,
        },
        {
          name: 'https://storage.googleapis.com/bucket/visual/vocab/arm.png',
          startTime: 1200,
          responseEnd: 4000,
          duration: 2800,
        },
        { name: 'https://storage.googleapis.com/bucket/clip.webm', startTime: 1300, responseEnd: 1800, duration: 500 },
        { name: 'https://example.com/app.js', startTime: 1400, responseEnd: 1600, duration: 200 },
      ],
      1000,
    );

    expect(summary).toEqual({
      audioCount: 0,
      imageCount: 2,
      videoCount: 1,
      downloadSpanMs: 3000,
      slowestMs: 2800,
    });
  });

  it('returns zeros when nothing loaded', () => {
    expect(summarizeMediaResources([], 0)).toEqual({
      audioCount: 0,
      imageCount: 0,
      videoCount: 0,
      downloadSpanMs: 0,
      slowestMs: 0,
    });
  });
});

describe('reportTaskMediaReady', () => {
  afterEach(() => {
    Logger.resetInstance();
    vi.restoreAllMocks();
  });

  it('sends one event for the first preload and none for later batches', () => {
    const capture = vi.fn();
    Logger.setInstance({ capture, error: vi.fn() }, { taskName: 'vocab' } as GameParamsType, {} as UserParamsType);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const entries = [
      {
        name: 'https://storage.googleapis.com/bucket/audio/en-US/coin.mp3',
        startTime: 1000,
        responseEnd: 1600,
        duration: 600,
      },
    ];
    markTaskLaunched('vocab', 'en-US', 1000);
    reportTaskMediaReady(1550, entries);
    reportTaskMediaReady(9000, entries);

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('Task media ready', {
      context: {
        taskName: 'vocab',
        language: 'en-US',
        readyMs: 550,
        audioCount: 1,
        imageCount: 0,
        videoCount: 0,
        downloadSpanMs: 600,
        slowestMs: 600,
      },
    });
    expect(JSON.stringify(capture.mock.calls[0][1])).not.toContain('storage.googleapis.com');
  });

  it('fires again after the next task launch', () => {
    const capture = vi.fn();
    Logger.setInstance({ capture, error: vi.fn() }, { taskName: 'trog' } as GameParamsType, {} as UserParamsType);

    markTaskLaunched('vocab', 'en-US', 1000);
    reportTaskMediaReady(1100, []);
    markTaskLaunched('trog', 'de-DE', 5000);
    reportTaskMediaReady(5800, []);

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls[1][1].context.taskName).toBe('trog');
    expect(capture.mock.calls[1][1].context.readyMs).toBe(800);
  });
});
