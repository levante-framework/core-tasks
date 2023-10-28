import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'
import { mediaAssets } from '../experiment';

export const introduction = {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
        return (
        `<div class='instruction-page-1'>
            <h1 class='header-white'>Hearts and Flowers Game</h1>
            <div>
                <img src=${mediaAssets.images.animalWhole} alt='Gray bear'/>
            </div>
        </div>`)
    },
    button_choices: ['Go'],
    button_html: [`
        <div class='go-btn'>
            <p>Go</p>
        </div>`
    ],
    on_load: () => {
        document.getElementById("jspsych-content").style.backgroundColor = 'red'
        const goBtn = document.getElementById("jspsych-html-multi-response-btngroup")
        goBtn.style.justifyContent = 'end'
        goBtn.style.marginRight = '1rem'
    },
    on_finish: () =>  document.getElementById("jspsych-content").style.backgroundColor = 'white'
}

const instructions = [
    "This is the heart game. Here's how you play it.",
    "This is the flower game. Here's how you play it.",
]

export const [heartInstructions, flowerInstructions] = instructions.map(instr => {
    return (
        {
            type: jsPsychHTMLMultiResponse,
            stimulus: () => {
                return (
                `<div>
                    <h1>${instr}</h1>
                    <div>
                        <img src=${mediaAssets.images.animalWhole} alt='Gray bear'/>
                    </div>
                </div>`)
            },
            button_choices: ['Next'],
            button_html: [
                `<div class='next-btn'>
                    <p>Next</p>
                </div>`
            ],
            on_load: () => {
                const nextBtn = document.getElementById("jspsych-html-multi-response-btngroup")
                nextBtn.style.justifyContent = 'end'
                nextBtn.style.marginRight = '1rem'
            },
        }
    )
})
