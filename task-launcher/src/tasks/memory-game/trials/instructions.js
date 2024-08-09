import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { isTouchScreen } from '../../taskSetup';
import { mediaAssets } from '../../..';
import { PageStateHandler, replayButtonSvg, setupReplayAudio, taskStore } from '../../shared/helpers';

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
    },
    {
        prompt: 'memoryGameBackwardPrompt',
        image: 'highlightedBlock',
        buttonText: 'continueButtonText',
    },
]

const replayButtonHtmlId = 'replay-btn-revisited'; 

export const instructions = instructionData.map(data => {
    return {
        type: jsPsychAudioMultiResponse,
        stimulus: () => mediaAssets.audio[data.prompt],
        prompt: () => {
            const t = taskStore().translations;
            return `<div id='stimulus-container'>
                        <button
                            id="${replayButtonHtmlId}"
                            class="replay"
                        >
                            ${replayButtonSvg}
                        </button>
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
            const t = taskStore().translations;
            return [
            `<button class="primary" style=margin-top:10%>
                ${t[data.buttonText]}
            </button>`,
            ]
        },
        keyboard_choices: 'NO_KEYS',
        on_load: () => {
            const pageStateHandler = new PageStateHandler(data.prompt);
            setupReplayAudio(pageStateHandler);
        }
    }
})

export const reverseOrderPrompt = instructions.pop()
export const readyToPlay = instructions.pop()
