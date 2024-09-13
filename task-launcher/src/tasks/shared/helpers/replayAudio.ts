import { PageAudioHandler } from "./audioHandler";
import { PageStateHandler } from "./PageStateHandler";


export async function setupReplayAudio(pageStateHandler: PageStateHandler, noAudio: boolean = false) {
  if (pageStateHandler.replayBtn) {
    if (!noAudio){
      pageStateHandler.disableReplayBtn();
      const enableDelayBuffer = 100; //in ms
      const totalStimulusDurationMs = await pageStateHandler.getStimulusDurationMs(); //in ms
      const totalDelay = totalStimulusDurationMs + enableDelayBuffer;
      setTimeout(() => {
        pageStateHandler.enableReplayBtn();
      }, totalDelay);
    }

    const onAudioEnd = () => {
      pageStateHandler.enableReplayBtn();
    }

    async function replayAudio() {
      pageStateHandler.disableReplayBtn();
      PageAudioHandler.playAudio(pageStateHandler.audioUri, onAudioEnd);
    }

    pageStateHandler.replayBtn.addEventListener('click', replayAudio);
  }
}
