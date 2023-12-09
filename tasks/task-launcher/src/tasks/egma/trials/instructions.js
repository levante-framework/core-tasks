import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response";



export const instructions = {
    type: jsPsychHTMLMultiResponse,
    data: () => {
        return {
        // save_trial: true,
           assessment_stage: 'instructions' 
        }
    },
    stimulus: `<div>
        <h1>Welcome to the math task</h1>

        <p>In this task, you will be asked different questions about math.</p>
        <p>This will include addition, subtraction, and multiplication.</p>
        <p>Your job is to get through as many questions as you can in the given time.</p>

        <p>Click the continue button or press any key to continue</p>
    </div>`,
    choices: 'ALL_KEYS',
    // trial_duration: 10000,
}