import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'
import { mediaAssets } from '../../..'


let position = Math.round(Math.random())

function randomizePosition() {
    position = Math.round(Math.random())
}

export const stimulus = (stimulus) => {
    return {
        type: jsPsychHTMLMultiResponse,
        stimulus: () => {
            return (
                `<div id='stimulus-container-hf'>
                    <div class='stimulus'>
                        ${position <= 0.5 ? `<img src=${mediaAssets.images[stimulus]} alt="heart or flower"/>` : ''}
                    </div>
                    <div class='stimulus'>
                        ${position > 0.5 ? `<img src=${mediaAssets.images[stimulus]} alt="heart or flower"/>` : ''}
                    </div>
                </div>`
            )
        },
        on_load: () => {
            document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf')
        },
        button_choices: ['left', 'right'],
        keyboard_choice: ['ArrowLeft', 'ArrowRight'],
        button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
        on_finish: (data) => {
            randomizePosition()
        },

        // DEFAULTS
        // stimulus_duration: null,
        // trial_duration: null,
        // response_ends_trial: true,
    }
}