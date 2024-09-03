import { jsPsych } from "../../taskSetup";
import { taskStore, PageAudioHandler } from "../helpers";
import { mediaAssets} from '../../..'; 


export function finishExperiment() {
    const t = taskStore().translations;
    const removeDOMElements = (event) => {
        if (event.type === 'click'){
            const buttonId = event.target.id;
            if (buttonId === 'exit-button') {
                document.body.innerHTML = '';
                window.removeEventListener('click', removeDOMElements);
                window.removeEventListener('keydown', removeDOMElements);
            }
        } else if (event.type === 'keydown'){
            document.body.innerHTML = '';
            window.removeEventListener('keydown', removeDOMElements);
            window.removeEventListener('click', removeDOMElements);
        }
    }
    window.addEventListener('click', removeDOMElements);
    window.addEventListener('keydown', removeDOMElements);

    jsPsych.endExperiment(
        `<div class='lev-stimulus-container'>
            <div class='lev-row-container instruction'>
                <h1>${t.taskFinished}</h1>
            </div>
            <footer>${t.generalFooter}</footer>
            <button id="exit-button" class="primary" style=margin-top:5%>Exit</button>
        </div>`,
        PageAudioHandler.playAudio(mediaAssets.audio.taskFinished)
    ); 
}
