import { jsPsych } from "../../taskSetup";
import { finishExperiment } from "../trials/finishExperiment";

// ends the task if 4 of the last 10 trials have been incorrect
export function checkCatStopping() {
    const data = jsPsych.data.get().filter({assessment_stage: 'test_response'}).last(10);

    const incorrectTrials = data.filter({correct: false}).count();
    if (incorrectTrials >= 4) {
        finishExperiment();
    }
}