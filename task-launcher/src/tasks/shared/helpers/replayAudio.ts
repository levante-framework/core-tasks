import { PageAudioHandler } from "./audioHandler";
import { PageStateHandler } from "./PageStateHandler";

export async function setupReplayAudio(pageStateHandler: PageStateHandler) {
  PageAudioHandler.replayPresses = 0; // reset to zero at beginning of trial

  if (pageStateHandler.replayBtn) {
    if (pageStateHandler.playStimulusOnLoad){
      pageStateHandler.disableReplayBtn();
      const enableDelayBuffer = 100; //in ms
      const totalStimulusDurationMs = await pageStateHandler.getStimulusDurationMs(); //in ms
      const totalDelay = totalStimulusDurationMs + enableDelayBuffer;
      setTimeout(() => {
        pageStateHandler.enableReplayBtn();
      }, totalDelay);
    }

    const audioConfig: AudioConfigType = {
      restrictRepetition: {
        enabled: false, 
        maxRepetitions: 2
      }, 
      onEnded: () => {pageStateHandler.enableReplayBtn()}
    }

    async function replayAudio() {
      PageAudioHandler.replayPresses ++;
      pageStateHandler.disableReplayBtn();
      PageAudioHandler.playAudio(pageStateHandler.audioUri, audioConfig);
    }

    pageStateHandler.replayBtn.addEventListener('click', replayAudio);
  }
}
