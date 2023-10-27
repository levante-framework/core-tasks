import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'
import { mediaAssets } from '../experiment'



export const practice1 = {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
        return (
            `<div id='stimulus-container'>
                <div class='stimulus'>
                    <img src=${mediaAssets.images.heart} alt="heart or flower"/>
                </div>
                <div class='stimulus'>
                    <p class='practice-text'>When you see a heart, press the button on the same side.</p>
                </div>
            </div>`
        )
    },
    button_choices: ['left', 'right'],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
}

export const practice2 = {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
        return (
            `<div id='stimulus-container'>
                <div class='stimulus'>
                    <p class='practice-text'>The heart is on the right side. Press the right button.</p>
                </div>
                <div class='stimulus'>
                    <img src=${mediaAssets.images.heart} alt="heart or flower"/>
                </div>
            </div>`
        )
    },
    button_choices: ['left', 'right'],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
}

export const practiceFeedbackWrong = {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
        return (
            `<div id='stimulus-container'>
                <div class='stimulus'>
                    <img src='${mediaAssets.images.heart}' alt="heart or flower"/>
                </div>
                <div class='stimulus'>
                    <p class='practice-text'>That's not right. Try again.</p>
                </div>
            </div>`
        )
    },
    button_choices: ['left', 'right'],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
}

export const practiceFeedbackRight = {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
        return (
            `<div id='stimulus-container'>
                <div class='stimulus'>
                    <img src=${mediaAssets.images.smilingFace} alt="heart or flower"/>
                </div>
                <div class='stimulus'>
                    <p class='practice-text'>Great! That's right!</p>
                </div>
            </div>`
        )   
    },
    trial_duration: 1500
}