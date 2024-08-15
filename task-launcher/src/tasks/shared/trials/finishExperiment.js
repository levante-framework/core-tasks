import { jsPsych } from "../../taskSetup";
import { taskStore, PageAudioHandler } from "../helpers";
import { mediaAssets} from '../../..'; 


export function finishExperiment() {
    const t = taskStore().translations;
    jsPsych.endExperiment(
        `<div class='instructions-container'>
            <div class='lev-row-container instruction'>
                <h1 class='instructions-title'>${t.taskFinished}</h1>
            </div>
        </div>`,
        PageAudioHandler.playAudio(mediaAssets.audio.taskFinished)
    ); 
}
