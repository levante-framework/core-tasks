import { jsPsych } from "../../taskSetup";

export const checkFallbackCriteria = () => {
    const data = jsPsych.data.get().filter({assessment_stage: 'test_response'}).last(4);
    const incorrectTrials = data.filter({correct: false}).count();

    return incorrectTrials >= 2;
};
