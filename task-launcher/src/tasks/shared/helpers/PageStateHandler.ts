/**
 * Class that handles the page state in a singleton
 * stores the stimuli length and replay button state and modifier
 */

//@ts-expect-error
import { camelize } from '@bdelab/roar-utils';
import { mediaAssets } from '../../..';
import { jsPsych } from '../../taskSetup';
import { getSpriteClip } from './audioSprites';

export class PageStateHandler {
  audioFile: string | string[];
  audioUri: string | string[];
  audioBuffer?: AudioBuffer | AudioBuffer[];
  replayBtn: HTMLButtonElement;
  playStimulusOnLoad: boolean;

  constructor(audioFile: string | string[], playStimulusOnLoad: boolean) {
    this.audioFile = audioFile;
    if (typeof this.audioFile === 'string') {
      this.audioUri = mediaAssets.audio[camelize(this.audioFile)] || mediaAssets.audio.nullAudio;
    } else {
      this.audioUri = this.audioFile.map((audio: string) => mediaAssets.audio[camelize(audio)]);
    }
    this.getbuffer();
    this.replayBtn = document.getElementById('replay-btn-revisited') as HTMLButtonElement;
    this.playStimulusOnLoad = playStimulusOnLoad !== undefined ? playStimulusOnLoad : true;
  }

  async getbuffer() {
    if (this.audioBuffer) {
      return this.audioBuffer;
    }
    if (typeof this.audioUri === 'string') {
      const sprite = getSpriteClip(this.audioUri);
      if (sprite) {
        // Duration is taken from the sprite clip; buffer retained for API compatibility
        this.audioBuffer = sprite.buffer;
        return this.audioBuffer;
      }
      this.audioBuffer = (await jsPsych.pluginAPI.getAudioBuffer(this.audioUri)) as AudioBuffer;
      return this.audioBuffer;
    } else {
      this.audioBuffer = (await Promise.all(
        this.audioUri.map(async (audio: string) => {
          const sprite = getSpriteClip(audio);
          if (sprite) return sprite.buffer;
          return jsPsych.pluginAPI.getAudioBuffer(audio);
        }),
      )) as AudioBuffer[];
      return this.audioBuffer;
    }
  }

  async getStimulusDurationMs() {
    if (typeof this.audioUri === 'string') {
      const sprite = getSpriteClip(this.audioUri);
      if (sprite) {
        return sprite.duration * 1000;
      }
    } else if (Array.isArray(this.audioUri)) {
      const spriteDurations = this.audioUri.map((uri) => getSpriteClip(uri)?.duration);
      if (spriteDurations.every((d) => typeof d === 'number')) {
        return (spriteDurations as number[]).reduce((acc, curr) => acc + curr * 1000, 0);
      }
    }

    const buffer = await this.getbuffer();

    if (buffer instanceof AudioBuffer) {
      return buffer.duration * 1000;
    } else {
      return buffer.reduce((acc, curr) => acc + curr.duration * 1000, 0);
    }
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
