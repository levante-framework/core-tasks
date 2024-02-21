//import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response";
import jsPsychAudioButtonResponse from "@jspsych-contrib/plugin-html-multi-response";


export const instructions1 = {
    type: jsPsychAudioButtonResponse,
    data: () => {
        return {
        // save_trial: true,
           assessment_stage: 'instructions' 
        }
    },
    stimulus: 'en/shared/trog-instruct1.mp3', // fixme! mediaAssets.audio[camelize(stim.audioFile)] ?
    prompt: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>Instructions</h1>

        <p>
            Now we're going to play a matching game! I'm going to say some words, and you touch the picture that goes with what I say. Ready?
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
    choices: ['OK'],
    button_html: '<button id="continue-btn">OK</button>',
    //button_choices: [`Continue`],
    //keyboard_choices: 'ALL_KEYS',
}
