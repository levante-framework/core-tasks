import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { isTouchScreen } from '../../taskSetup';
import { mediaAssets } from '../../..';
import { replayButtonDiv, setupReplayAudio } from '../../shared/helpers';

const instructionData = [
    {
        prompt: 'matrixReasoningInstruct1',
        image: 'matrixExample', // GIF?
        buttonText: 'continueButtonText',
    },
]

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
            let audioSource
            setupReplayAudio(audioSource, data.prompt)
        }
    }
})

