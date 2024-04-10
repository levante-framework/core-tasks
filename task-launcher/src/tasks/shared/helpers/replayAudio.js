import { jsPsych } from "../../taskSetup";
import { mediaAssets } from "../../..";
import { camelize } from "@bdelab/roar-utils";


export function setupReplayAudio(audioSource, audioFile) {
    // Hardcoded since it uses the replayButtonDiv comopnent
    const replayBtn = document.getElementById('replay-btn');

    if (replayBtn) {
      // TODO: this only stops the Replay button from being used if it was already used
        let isAudioPlaying = false;  
      
        async function replayAudio() {  
            if (isAudioPlaying) return

            const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

            isAudioPlaying = true;

            // Returns a promise of the AudioBuffer of the preloaded file path.
            const audioBuffer = await jsPsych
                .pluginAPI
                .getAudioBuffer(mediaAssets.audio[camelize(audioFile)] ||
                                mediaAssets.audio.nullAudio,);

            audioSource = jsPsychAudioCtx.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(jsPsychAudioCtx.destination);
            audioSource.start(0);

            audioSource.onended = () => {
                isAudioPlaying = false;
            };
        }

        replayBtn.addEventListener('click', replayAudio);
    }
}
