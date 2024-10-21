import { PageAudioHandler } from "./audioHandler";
import { PageStateHandler } from "./PageStateHandler";
// @ts-ignore
import { jsPsych } from '../../taskSetup';

var replayPresses = 0;

export function saveReplayPresses(){
  jsPsych.data.addDataToLastTrial({
    audioButtonPresses: replayPresses
  }); 
}

export async function setupReplayAudio(pageStateHandler: PageStateHandler) {
  replayPresses = 0; // reset to zero at beginning of trial

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

    const onAudioEnd = () => {
      pageStateHandler.enableReplayBtn();
    }

    async function replayAudio() {
      replayPresses ++;
      pageStateHandler.disableReplayBtn();
      PageAudioHandler.playAudio(pageStateHandler.audioUri, onAudioEnd); 
    }

    pageStateHandler.replayBtn.addEventListener('click', replayAudio);
  }
}
