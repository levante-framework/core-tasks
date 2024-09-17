/**
 * Class that handles the page state in a singleton
 * stores the stimuli length and replay button state and modifier
 */
//@ts-ignore
import { jsPsych } from "../../taskSetup";
//@ts-ignore
import { camelize } from "@bdelab/roar-utils";
//@ts-ignore
import { mediaAssets } from "../../..";

export class PageStateHandler {
  audioFile: string;
  audioUri: string;
  audioBuffer?: AudioBuffer;
  replayBtn: HTMLButtonElement;
  playStimulusOnLoad: boolean;

  constructor(audioFile: string, playStimulusOnLoad: boolean) {
    this.audioFile = audioFile;
    this.audioUri = mediaAssets.audio[camelize(this.audioFile)] ||
    mediaAssets.audio.nullAudio;
    this.getbuffer();
    this.replayBtn = document.getElementById('replay-btn-revisited') as HTMLButtonElement;
    this.playStimulusOnLoad = playStimulusOnLoad !== undefined ? playStimulusOnLoad : true;
  }

  async getbuffer() {
    if (this.audioBuffer) {
      return this.audioBuffer;
    }
    this.audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(this.audioUri) as AudioBuffer;
    return this.audioBuffer;
  }

  async getStimulusDurationMs() {
    const buffer = await this.getbuffer();
    return buffer.duration * 1000;
  }

  isReplayBtnEnabled() {
    return this.replayBtn.hasAttribute('disabled');
  }

  enableReplayBtn() {
    this.replayBtn.disabled = false;
  }

  disableReplayBtn() {
    this.replayBtn.disabled = true;
  }
}