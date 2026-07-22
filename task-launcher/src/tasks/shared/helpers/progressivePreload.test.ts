import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../taskSetup', () => ({
  jsPsych: {
    finishTrial: vi.fn(),
    pluginAPI: {
      preloadImages: (_files: string[], cb: () => void) => cb(),
      preloadAudio: (_files: string[], cb: () => void) => cb(),
      preloadVideo: (_files: string[], cb: () => void) => cb(),
    },
  },
}));

vi.mock('@jspsych-contrib/plugin-html-multi-response', () => ({
  default: class {},
}));

vi.mock('./createPreloadTrials', () => ({
  createPreloadTrials: () => ({ default: { type: 'preload-mock' } }),
}));

vi.mock('../../../taskStore', () => ({
  taskStore: () => ({
    assetsPerTask: {
      shared: {
        audio: ['feedbackGoodJob', 'feedbackCorrect', 'feedbackNotQuiteRight'],
      },
    },
  }),
}));

const logoMocks = vi.hoisted(() => ({
  showLevanteLogoLoading: vi.fn(),
  hideLevanteLogoLoading: vi.fn(),
}));

vi.mock('./loadingScreen', () => logoMocks);

import { jsPsych } from '../../taskSetup';
import {
  awaitBackgroundBankLoad,
  createAwaitBackgroundBankTrial,
  createCatCriticalLaunch,
  createProgressiveCatInitialPreload,
  isBackgroundBankReady,
  partitionCriticalMedia,
  resetBackgroundBankLoad,
  selectInstructionPracticeTrials,
  startBackgroundBankLoad,
} from './progressivePreload';

function mediaFixture(): MediaAssetsType {
  return {
    images: {
      practiceImg: 'https://cdn.example/visual/practice.png',
      bankImg: 'https://cdn.example/visual/bank.png',
      sharedIcon: 'https://cdn.example/visual/shared/icon.png',
    },
    audio: {
      practiceAudio: 'https://cdn.example/audio/practice.mp3',
      bankAudio: 'https://cdn.example/audio/bank.mp3',
      sharedPrompt: 'https://cdn.example/audio/shared/prompt.mp3',
      // Language-bucket shared feedback (not under /audio/shared/)
      feedbackGoodJob: 'https://cdn.example/audio/en-US/feedbackGoodJob.mp3',
      feedbackCorrect: 'https://cdn.example/audio/en-US/feedbackCorrect.mp3',
      feedbackNotQuiteRight: 'https://cdn.example/audio/en-US/feedbackNotQuiteRight.mp3',
      select: 'https://cdn.example/audio/select.mp3',
      coin: 'https://cdn.example/audio/coin.mp3',
      fail: 'https://cdn.example/audio/fail.mp3',
      inputAudioCue: 'https://cdn.example/audio/cue.mp3',
      nullAudio: 'https://cdn.example/audio/null.mp3',
      pop: 'https://cdn.example/audio/pop.mp3',
    },
    video: {
      demo: 'https://cdn.example/video/demo.mp4',
      extra: 'https://cdn.example/video/extra.mp4',
    },
  };
}

describe('selectInstructionPracticeTrials', () => {
  const light = [{ itemId: 'light-1' }] as StimulusType[];
  const heavy = [{ itemId: 'heavy-1' }] as StimulusType[];

  it('uses ipLight for standard variants', () => {
    expect(selectInstructionPracticeTrials({ ipLight: light, ipHeavy: heavy }, false)).toBe(light);
  });

  it('uses ipHeavy when heavyInstructions is set and heavy trials exist', () => {
    expect(selectInstructionPracticeTrials({ ipLight: light, ipHeavy: heavy }, true)).toBe(heavy);
  });

  it('falls back to ipLight when heavyInstructions is set but ipHeavy is empty', () => {
    expect(selectInstructionPracticeTrials({ ipLight: light, ipHeavy: [] }, true)).toBe(light);
  });
});

describe('partitionCriticalMedia', () => {
  it('puts instruction/practice trial assets on the critical pack', () => {
    const media = mediaFixture();
    const trials = [
      {
        item: 'practice-img',
        audioFile: 'practice-audio',
      },
    ] as StimulusType[];

    const { critical, rest } = partitionCriticalMedia(media, trials, ['item'], ['audioFile']);

    expect(critical.images.practiceImg).toBe(media.images.practiceImg);
    expect(critical.audio.practiceAudio).toBe(media.audio.practiceAudio);
    expect(rest.images.bankImg).toBe(media.images.bankImg);
    expect(rest.audio.bankAudio).toBe(media.audio.bankAudio);
    expect(rest.images.practiceImg).toBeUndefined();
    expect(rest.audio.practiceAudio).toBeUndefined();
  });

  it('keeps shared assets and plugin SFX on the critical pack', () => {
    const media = mediaFixture();
    const { critical, rest } = partitionCriticalMedia(media, [], ['item'], ['audioFile']);

    expect(critical.images.sharedIcon).toBe(media.images.sharedIcon);
    expect(critical.audio.sharedPrompt).toBe(media.audio.sharedPrompt);
    expect(critical.audio.select).toBe(media.audio.select);
    expect(critical.audio.coin).toBe(media.audio.coin);
    expect(rest.images.sharedIcon).toBeUndefined();
    expect(rest.audio.select).toBeUndefined();
  });

  it('keeps assetsPerTask.shared.audio on the critical pack even under language buckets', () => {
    const media = mediaFixture();
    const { critical, rest } = partitionCriticalMedia(media, [], ['item'], ['audioFile']);

    expect(critical.audio.feedbackGoodJob).toBe(media.audio.feedbackGoodJob);
    expect(critical.audio.feedbackCorrect).toBe(media.audio.feedbackCorrect);
    expect(critical.audio.feedbackNotQuiteRight).toBe(media.audio.feedbackNotQuiteRight);
    expect(rest.audio.feedbackGoodJob).toBeUndefined();
    expect(rest.audio.feedbackCorrect).toBeUndefined();
    expect(rest.audio.bankAudio).toBe(media.audio.bankAudio);
  });

  it('keeps all videos on the critical pack', () => {
    const media = mediaFixture();
    const { critical, rest } = partitionCriticalMedia(media, [], ['item'], ['audioFile']);

    expect(critical.video).toEqual(media.video);
    expect(Object.keys(rest.video)).toHaveLength(0);
  });
});

describe('background bank load', () => {
  beforeEach(() => {
    resetBackgroundBankLoad();
    logoMocks.showLevanteLogoLoading.mockClear();
    logoMocks.hideLevanteLogoLoading.mockClear();
    vi.mocked(jsPsych.finishTrial).mockClear();
  });

  it('await is a no-op when the bank was never started', async () => {
    await expect(awaitBackgroundBankLoad()).resolves.toBeUndefined();
    expect(isBackgroundBankReady()).toBe(false);
  });

  it('reuses one promise across startBackgroundBankLoad calls', async () => {
    const media = mediaFixture();
    const rest = {
      images: { bankImg: media.images.bankImg },
      audio: { bankAudio: media.audio.bankAudio },
      video: {},
    };

    const first = startBackgroundBankLoad({ rest });
    const second = startBackgroundBankLoad({ rest });
    expect(first).toBe(second);
    await expect(awaitBackgroundBankLoad()).resolves.toBeUndefined();
    expect(isBackgroundBankReady()).toBe(true);
  });

  it('marks bank ready after load settles and clears on reset', async () => {
    const media = mediaFixture();
    expect(isBackgroundBankReady()).toBe(false);
    startBackgroundBankLoad({
      rest: { images: { bankImg: media.images.bankImg }, audio: {}, video: {} },
    });
    await awaitBackgroundBankLoad();
    expect(isBackgroundBankReady()).toBe(true);
    resetBackgroundBankLoad();
    expect(isBackgroundBankReady()).toBe(false);
  });

  it('await trial skips logo when bank is already ready', async () => {
    const media = mediaFixture();
    startBackgroundBankLoad({
      rest: { images: { bankImg: media.images.bankImg }, audio: {}, video: {} },
    });
    await awaitBackgroundBankLoad();

    const trial = createAwaitBackgroundBankTrial();
    await (trial.on_load as () => Promise<void>)();

    expect(logoMocks.showLevanteLogoLoading).not.toHaveBeenCalled();
    expect(logoMocks.hideLevanteLogoLoading).not.toHaveBeenCalled();
    expect(jsPsych.finishTrial).toHaveBeenCalledWith({
      backgroundBankReady: true,
      waitedForBank: false,
    });
  });

  it('await trial shows logo while waiting for the bank', async () => {
    let resolveImages!: () => void;
    const preloadImages = vi.fn((_files: string[], cb: () => void) => {
      resolveImages = cb;
    });
    const previousPreload = jsPsych.pluginAPI.preloadImages;
    vi.mocked(jsPsych.pluginAPI).preloadImages = preloadImages;

    try {
      const media = mediaFixture();
      startBackgroundBankLoad({
        rest: { images: { bankImg: media.images.bankImg }, audio: {}, video: {} },
      });
      expect(isBackgroundBankReady()).toBe(false);

      const trial = createAwaitBackgroundBankTrial();
      const onLoadPromise = (trial.on_load as () => Promise<void>)();

      expect(logoMocks.showLevanteLogoLoading).toHaveBeenCalledTimes(1);
      expect(logoMocks.hideLevanteLogoLoading).not.toHaveBeenCalled();

      resolveImages();
      await onLoadPromise;

      expect(isBackgroundBankReady()).toBe(true);
      expect(logoMocks.hideLevanteLogoLoading).toHaveBeenCalledTimes(1);
      expect(jsPsych.finishTrial).toHaveBeenCalledWith({
        backgroundBankReady: true,
        waitedForBank: true,
      });
    } finally {
      vi.mocked(jsPsych.pluginAPI).preloadImages = previousPreload;
    }
  });
});

describe('createProgressiveCatInitialPreload', () => {
  it('returns critical preload then kick-background trial', () => {
    const media = mediaFixture();
    const trials = [
      {
        item: 'practice-img',
        audioFile: 'practice-audio',
      },
    ] as StimulusType[];

    const trialsOut = createProgressiveCatInitialPreload(media, {
      criticalTrials: trials,
      imageFields: ['item'],
      audioFields: ['audioFile'],
    });

    expect(trialsOut).toHaveLength(2);
    expect(trialsOut[0].type).toBe('preload-mock');
    expect(typeof trialsOut[0].on_finish).toBe('function');
    expect(trialsOut[1]).toMatchObject({
      trial_duration: null,
      response_ends_trial: false,
    });
    expect(typeof trialsOut[1].on_load).toBe('function');
  });
});

describe('createCatCriticalLaunch', () => {
  const light = [{ itemId: 'light-1', answer: 'practice-img', audioFile: 'practice-audio' }] as StimulusType[];
  const heavy = [{ itemId: 'heavy-1', answer: 'practice-img', audioFile: 'practice-audio' }] as StimulusType[];

  it('selects heavy practice and returns preload plus kick trials', () => {
    const media = mediaFixture();
    const { instructionPractice, preloadTrials } = createCatCriticalLaunch(media, {
      corpora: { ipLight: light, ipHeavy: heavy },
      heavyInstructions: true,
      imageFields: ['answer'],
      audioFields: ['audioFile'],
    });

    expect(instructionPractice).toBe(heavy);
    expect(preloadTrials).toHaveLength(2);
    expect(preloadTrials[0].type).toBe('preload-mock');
    expect(typeof preloadTrials[1].on_load).toBe('function');
  });

  it('selects light practice when heavyInstructions is false', () => {
    const media = mediaFixture();
    const { instructionPractice, preloadTrials } = createCatCriticalLaunch(media, {
      corpora: { ipLight: light, ipHeavy: heavy },
      heavyInstructions: false,
      imageFields: ['answer'],
    });

    expect(instructionPractice).toBe(light);
    expect(preloadTrials).toHaveLength(2);
  });

  it('falls back to light practice when heavy is empty', () => {
    const media = mediaFixture();
    const { instructionPractice } = createCatCriticalLaunch(media, {
      corpora: { ipLight: light, ipHeavy: [] },
      heavyInstructions: true,
      imageFields: ['answer'],
    });

    expect(instructionPractice).toBe(light);
  });
});
