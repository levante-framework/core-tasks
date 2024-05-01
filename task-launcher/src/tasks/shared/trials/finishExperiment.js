import store from "store2";
import { jsPsych } from "../../taskSetup";


export function finishExperiment() {
    store.session.set('incorrectTrials', 0);
    const t = store.session.get('translations');
    jsPsych.endExperiment(
      `<div id="prompt-container-text">
                <p id="prompt">${t.taskCompletion}</p>
            </div>`,
    ); // ToDo: style text and add audio message?
}
