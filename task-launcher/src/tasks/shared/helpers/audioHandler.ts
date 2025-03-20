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
  static maxReplays: number = 2; 
  static replays: number = 0; 

  static stopAndDisconnectNode() {
    if (PageAudioHandler.audioSource) {
      PageAudioHandler.audioSource.stop();
      PageAudioHandler.audioSource.disconnect();
      PageAudioHandler.audioSource = undefined;
    }
  }

  static async playAudio(audioUri: string, onEnded?: Function) {
    // check for repeat audio
    if (PageAudioHandler.audioUri === audioUri) {
      PageAudioHandler.replays ++; 
    } else {
      PageAudioHandler.replays = 0; 
    }

    PageAudioHandler.audioUri = audioUri;

    // mute audio if it has already been played twice
    if (PageAudioHandler.replays >= 2) {
      audioUri = mediaAssets.audio.nullAudio;
    };

    const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();
    // Returns a promise of the AudioBuffer of the preloaded file path.
    const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(audioUri) as AudioBuffer;
    const audioSource: AudioBufferSourceNode = jsPsychAudioCtx.createBufferSource();
    PageAudioHandler.audioSource = audioSource;
    audioSource.buffer = audioBuffer;
    audioSource.connect(jsPsychAudioCtx.destination);
    audioSource.onended = () => {
      // PageAudioHandler.stopAndDisconnectNode();
      if (onEnded) {
        onEnded();
      }
    };
    audioSource.start(0);
  }
}
