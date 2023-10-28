import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'
import { mediaAssets } from '../experiment'
import store from 'store2'

const practiceData = [
    {
        text: 'When you see a heart, press the button on the same side.',
        stimulus: 'heart'
    },
    {
        text: 'The heart is on the right side. Press the right button.',
        stimulus: 'heart'
    },
    {
        text: 'When you see a flower, press the button on the opposite side.',
        stimulus: 'flower'
    },
    {
        text: 'The flower is on the right side. Press the left button.',
        stimulus: 'flower'
    },
    {
        text: 'Remember! When you see a HEART, press the button on the SAME side.',
        stimulus: 'heart'
    },
    {
        text: 'Remember! When you see a FLOWER, press the button on the OPPOSITE side.',
        stimulus: 'flower'
    },
]



const practiceTrials = practiceData.map((data, i) => {
    return (
        {
            type: jsPsychHTMLMultiResponse,
            stimulus: () => {
                if (i % 2 === 0) {
                    return (
                        `<div id='stimulus-container'>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[data.stimulus]} alt="heart or flower"/>
                            </div>
                            <div class='stimulus'>
                                <p class='practice-text'>${data.text}</p>
                            </div>
                        </div>`
                    )
                } else {
                    return (
                        `<div id='stimulus-container'>
                            <div class='stimulus'>
                                <p class='practice-text'>${data.text}</p>
                            </div>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[data.stimulus]} alt="heart or flower"/>
                            </div>
                        </div>`
                    )
                }

            },
            button_choices: ['left', 'right'],
            keyboard_choice: ['ArrowLeft', 'ArrowRight'],
            button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
            on_finish: (data) => {
                // get response
                // write to store

                store.session.set('prevStimulus', data.stimulus)
            },
        }
    )
})

export const [
    heartPractice1, 
    heartPractice2, 
    flowerPractice1, 
    flowerPractice2, 
    reminderHeart, 
    reminderFlower] = practiceTrials


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
    trial_duration: () => {
        // check if response was correct, if not show until correct choice is selected
    }
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