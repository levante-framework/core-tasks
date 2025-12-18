import { jsPsych } from '../../taskSetup';
import { mediaAssets } from '../../..';

export class PageAudioHandler {
  constructor() {
    throw new Error('Cannot initialize the singleton static class PageAudioHandler');
  }

  static audioContext: BaseAudioContext;
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

  static async playAudio(audioUri: string, config: AudioConfigType = this.defaultAudioConfig) {
    const { enabled, maxRepetitions } = config.restrictRepetition;
    const { onEnded } = config;

    // check for repeat audio
    if (PageAudioHandler.audioUri === audioUri && enabled) {
      PageAudioHandler.replays++;
    } else {
      PageAudioHandler.replays = 0;
    }

    PageAudioHandler.audioUri = audioUri;

    // replace audio with ding if it has already been played twice
    if (PageAudioHandler.replays >= maxRepetitions) {
      audioUri = mediaAssets.audio.inputAudioCue;
    }

    try {
      const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

      if (jsPsychAudioCtx.state === 'suspended') {
        const replayButton = document.getElementById('replay-btn-revisited') as HTMLButtonElement;
        replayButton.disabled = false; 
        replayButton.style.animation = 'pulse 1s 1s infinite';

        function retryAudio() {
          jsPsychAudioCtx.resume();
          replayButton.style.animation = '';
          replayButton.disabled = true;
        }

        replayButton.addEventListener('click', retryAudio);
        replayButton.addEventListener('touchend', retryAudio);
      }

      // Returns a promise of the AudioBuffer of the preloaded file path.
      const audioBuffer = (await jsPsych.pluginAPI.getAudioBuffer(audioUri)) as AudioBuffer | null;

      const audioSource: AudioBufferSourceNode = jsPsychAudioCtx.createBufferSource();
      PageAudioHandler.audioSource = audioSource;
      audioSource.buffer = audioBuffer;
      audioSource.connect(jsPsychAudioCtx.destination);
      audioSource.onended = () => {
        if (onEnded) onEnded();
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
