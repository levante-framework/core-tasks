import { jsPsych } from "../../taskSetup";
import { mediaAssets } from "../../..";
import { camelize } from "@bdelab/roar-utils";
import { PageAudioHandler } from "./audioHandler";


export async function setupReplayAudio(audioSource, audioFile) {
  // Hardcoded since it uses the replayButtonDiv comopnent
  const replayBtn = document.getElementById('replay-btn-revisited');

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
      PageAudioHandler.playAudio(audioUri, false, onAudioEnd);
    }

    replayBtn.addEventListener('click', replayAudio);
  }
}
