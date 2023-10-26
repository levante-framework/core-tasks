import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'
import { mediaAssets } from '../experiment'

let position = Math.round(Math.random())

function random() {
    position = Math.round(Math.random())
    console.log({position})
}

export const heartStimulus = {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
        return (
            `<div id='stimulus-container'>
                <div class='stimulus'>
                    ${position <= 0.5 ? `<img src=${mediaAssets.images.heart} alt="heart or flower"/>` : ''}
                </div>
                <div class='stimulus'>
                    ${position > 0.5 ? `<img src=${mediaAssets.images.heart} alt="heart or flower"/>` : ''}
                </div>
            </div>`
        )
    },
    button_choices: ['left', 'right'],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
    on_finish: (data) => {
        position = random()
    }

    // DEFAULTS
    // stimulus_duration: null,
    // trial_duration: null,
    // response_ends_trial: true,
}