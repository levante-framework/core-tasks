import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import { jsPsych } from '../../taskSetup';
import { appendAudioKey } from './audioKeysContainer';
import { camelize } from './camelize';

export class PageAudioHandler {
  constructor() {
    throw new Error('Cannot initialize the singleton static class PageAudioHandler');
  }

  static audioContext: BaseAudioContext;
  static audioKey: string;
  static audioUri: string;
  static audioSource?: AudioBufferSourceNode;
  static replayPresses: number;
  static replays: number = 0;

  static defaultAudioConfig: AudioConfigType = {
    restrictRepetition: {
      enabled: true,
      maxRepetitions: 2,
    },
  };

  static stopAndDisconnectNode() {
    if (PageAudioHandler.audioSource) {
      PageAudioHandler.audioSource.stop();
      PageAudioHandler.audioSource.disconnect();
      PageAudioHandler.audioSource = undefined;
    }
  }

  static async getAudioDuration(audioUri: string) {
    const audioBuffer = (await jsPsych.pluginAPI.getAudioBuffer(audioUri)) as AudioBuffer | null;
    return audioBuffer?.duration;
  }

  static async playAudio(
    audioKey: string,
    config: AudioConfigType = PageAudioHandler.defaultAudioConfig,
    setClassAudioField: boolean = true,
    audioKeysContainerClass?: string,
  ) {
    const { enabled, maxRepetitions } = config.restrictRepetition;
    const { onEnded } = config;

    let resolvedAudioKey = audioKey;
    let audioUri = mediaAssets.audio[camelize(audioKey)] || mediaAssets.audio.nullAudio;

    // check for repeat audio
    if (PageAudioHandler.audioKey === audioKey && enabled) {
      PageAudioHandler.replays++;
    } else if (enabled) {
      PageAudioHandler.replays = 0;
    }

    if (setClassAudioField) {
      PageAudioHandler.audioKey = audioKey;
      PageAudioHandler.audioUri = audioUri;
    }

    // replace audio with ding if it has already been played twice
    if (PageAudioHandler.replays > maxRepetitions && enabled) {
      resolvedAudioKey = 'inputAudioCue';
      audioUri = mediaAssets.audio.inputAudioCue;
    }

    if (taskStore().showAudioKeys) {
      appendAudioKey(resolvedAudioKey, audioKeysContainerClass);
    }

    try {
      const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

      // Returns a promise of the AudioBuffer of the preloaded file path.
      const audioBuffer = (await jsPsych.pluginAPI.getAudioBuffer(audioUri)) as AudioBuffer | null;

      const audioSource: AudioBufferSourceNode = jsPsychAudioCtx.createBufferSource();
      PageAudioHandler.audioSource = audioSource;
      audioSource.buffer = audioBuffer;
      audioSource.connect(jsPsychAudioCtx.destination);
      audioSource.onended = () => {
        if (PageAudioHandler.replays === maxRepetitions && enabled) {
          const audioConfig: AudioConfigType = {
            restrictRepetition: {
              enabled: false,
              maxRepetitions: 2,
            },
            onEnded: () => {
              if (onEnded) onEnded();
            },
          };

          PageAudioHandler.playAudio('inputAudioCue', audioConfig, false);
        } else {
          if (onEnded) onEnded();
        }
      };
      audioSource.start(0);
    } catch {
      // Swallow errors to avoid test/runtime crashes when audio cannot be played
      return;
    }
  }

  // required on iOS to prevent autoplay blocking
  static unlockAudioContext() {
    const ctx = jsPsych.pluginAPI.audioContext();

    // safari requires resuming audio context on user interaction, then it can be used freely later
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  }
}
