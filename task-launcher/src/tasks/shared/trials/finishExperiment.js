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
            <footer>${t.generalFooter}</footer>
            <button id="exit-button" class="primary" style=margin-top:5%>Exit</button>
        </div>`,
        PageAudioHandler.playAudio(mediaAssets.audio.taskFinished)
    ); 

    window.addEventListener('click', (event) => {
        const buttonId = event.target.id;
        if (buttonId === 'exit-button') {
            document.body.innerHTML = '';
        }
    }); 

    document.addEventListener('keydown', () => {
            document.body.innerHTML = '';
    });
}
