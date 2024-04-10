import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { isTouchScreen } from '../../taskSetup';
import { mediaAssets } from '../../..';
import { replayButtonDiv, setupReplayAudio } from '../../shared/helpers';

const instructionData = [
    {
        prompt: 'memoryGameInstruct1',
        image: 'catAvatar',
        buttonText: 'continueButtonText',
    },
    {
        prompt: 'memoryGameInstruct2',
        image: 'highlightedBlock',
        buttonText: 'continueButtonText',
    },
    {
        prompt: 'memoryGameInstruct3',
        video: 'selectSequence',
        buttonText: 'continueButtonText',
    },
    {
        prompt: 'memoryGameInstruct4',
        image: 'catAvatar',
        buttonText: 'continueButtonText',
    },
    {
        prompt: 'memoryGameInstruct5',
        image: 'catAvatar',
        buttonText: 'continueButtonText',
        bottomText: 'memoryGameInstruct7',
    },
    {
        prompt: 'memoryGameBackwardPrompt',
        image: 'highlightedBlock',
        buttonText: 'continueButtonText',
    },
]

let audioSource

export const instructions = instructionData.map(data => {
    return {
        type: jsPsychAudioMultiResponse,
        stimulus: () => mediaAssets.audio[data.prompt],
        prompt: () => {
            const t = store.session.get('translations');
            return `<div id='stimulus-container'>
                        ${replayButtonDiv}
                        <div id='prompt-container-text'>
                            <h1 id='prompt'>${t[data.prompt]}</h1>
                        </div>

                        ${data.video ? 
                            `<video id='instruction-video' autoplay loop>
                                <source src=${mediaAssets.video[data.video]} type='video/mp4'>
                            </video>` :
                            `<img id='instruction-graphic' src=${mediaAssets.images[data.image]} alt='Instruction graphic'/>`
                        }
                        
                        ${data.bottomText ? `<footer id='footer'>${t[data.bottomText]}</footer>` : ''}
                    </div>`;
        },
        prompt_above_buttons: true,
        button_choices: ['Next'],
        button_html: () => {
            const t = store.session.get('translations');
            return [
            `<button id='continue-btn'>
                ${t[data.buttonText]}
            </button>`,
            ]
        },
        keyboard_choices: () => isTouchScreen ? 'NO_KEYS' : 'ALL_KEYS',
        on_load: () => {
            setupReplayAudio(audioSource, data.prompt)
        }
    }
})

export const reverseOrderPrompt = instructions.pop()
export const readyToPlay = instructions.pop()
