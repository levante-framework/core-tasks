//@ts-ignore
import { jsPsych } from "../../taskSetup";
//@ts-ignore
import { mediaAssets } from "../../..";
//@ts-ignore
import { camelize } from "@bdelab/roar-utils";
import { PageAudioHandler } from "./audioHandler";


export async function setupReplayAudio(audioFile: string) {
  // Hardcoded since it uses the replayButtonDiv comopnent
  const replayBtn = document.getElementById('replay-btn-revisited') as HTMLButtonElement;

  if (replayBtn) {
    const audioUri = mediaAssets.audio[camelize(audioFile)] ||
    mediaAssets.audio.nullAudio;
    const buffer = await jsPsych.pluginAPI.getAudioBuffer(audioUri);
    replayBtn.disabled = true;
    const enableDelayBuffer = 100; //in ms
    const totalStimulusDurationMs = buffer.duration * 1000 //in ms
    const totalDelay = totalStimulusDurationMs + enableDelayBuffer;
    setTimeout(() => {
      replayBtn.disabled = false;
    }, totalDelay);

    const onAudioEnd = () => {
      replayBtn.disabled = false;
    }

    async function replayAudio() {
      replayBtn.disabled = true;
      PageAudioHandler.playAudio(audioUri, onAudioEnd);
    }

    replayBtn.addEventListener('click', replayAudio);
  }
}
