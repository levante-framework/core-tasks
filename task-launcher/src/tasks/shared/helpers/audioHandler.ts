//@ts-ignore
import { jsPsych } from '../../taskSetup';

export class PageAudioHandler {
  constructor() {
    throw new Error('Cannot initialize the singleton static class PageAudioHandler');
  }

  static audioContext: BaseAudioContext;
  static audioUri: string;
  static audioSource?: AudioBufferSourceNode;

  static stopAndDisconnectNode() {
    if (PageAudioHandler.audioSource) {
      PageAudioHandler.audioSource.stop();
      PageAudioHandler.audioSource.disconnect();
      PageAudioHandler.audioSource = undefined;
    }
  }

  static async playAudio(audioUri: string, onEnded?: Function) {
    PageAudioHandler.audioUri = audioUri;
    const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();
    // Returns a promise of the AudioBuffer of the preloaded file path.
    const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(audioUri);
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
