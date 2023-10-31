import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response'
import { mediaAssets } from '../experiment';

export const introduction = {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
        return (
        `<div class='instruction-page-1'>
            <h1 class='header-white'>Hearts and Flowers Game</h1>
            <div >
                <img id='instruction-graphic' src=${mediaAssets.images.animalWhole} alt='Gray bear'/>
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

const instructionData = [
    { text: "This is the heart game. Here's how you play it.",
      buttonText: "Next",
      image: () => mediaAssets.images.animalWhole
    },
    { text: "This is the flower game. Here's how you play it.",
      buttonText: "Next",
      image: () => mediaAssets.images.animalWhole
    },
    { text: "Time to practice!",
      buttonText: "Go",
      image: () => mediaAssets.images.animalWhole
    },
    { text: "This time the game will go faster. It won't tell you if you are right or wrong.",
      buttonText: "Next",
      image: () => mediaAssets.images.keepup,
      bottomText: "Try to Keep up!"
    },
    { text: "Try to answer as fast as you can without making mistakes.",
      buttonText: "Next",
      image: () => mediaAssets.images.rocket,
      bottomText: "If you make a mistake, just keep going!"
    },
    { text: "Time to play!",
      buttonText: "Go",
      image: () => mediaAssets.images.animalWhole
    },
    { text: "Now we're going to play a game with hearts and flowers.",
      buttonText: "Next",
      image: () => mediaAssets.images.animalWhole
    },
    { text: "Great job! You completed the game!.",
      buttonText: "Close",
      image: () => mediaAssets.images.animalWhole
    },
]

export const [
    heartInstructions, 
    flowerInstructions, 
    timeToPractice, 
    keepUp, 
    keepGoing, 
    timeToPlay, 
    heartsAndFlowers,
    endGame
] = instructionData.map(data => {
    return (
        {
            type: jsPsychHTMLMultiResponse,
            stimulus: () => {
                return (
                `<div>
                    <h1>${data.text}</h1>
                    <div >
                        <img id='instruction-graphic' src=${data.image()} alt='Instruction graphic'/>
                    </div>
                    ${data.bottomText ? `<p>${data.bottomText}</p>` : ''}
                </div>`)
            },
            button_choices: ['Next'],
            button_html: [
                `<div class='next-btn'>
                    <p>${data.buttonText}</p>
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
