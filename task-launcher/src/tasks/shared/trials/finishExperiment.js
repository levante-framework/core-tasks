import { jsPsych } from "../../taskSetup";
import { taskStore } from "../helpers";


export function finishExperiment() {
    const t = taskStore().translations;
    jsPsych.endExperiment(
      `<div id="prompt-container-text">
                <p id="prompt">${t?.taskCompletion || 'Thank you for completing the task! You can now close the window.'}</p>
            </div>`,
    ); // ToDo: style text and add audio message?
}
