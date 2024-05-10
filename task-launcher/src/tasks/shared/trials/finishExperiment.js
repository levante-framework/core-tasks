import store from "store2";
import { jsPsych } from "../../taskSetup";


export function finishExperiment() {
    const t = store.session('translations');
    store.clearAll()
    jsPsych.endExperiment(
      `<div id="prompt-container-text">
                <p id="prompt">${t?.taskCompletion || 'Thank you for completing the task! You can now close the window.'}</p>
            </div>`,
    ); // ToDo: style text and add audio message?
}
