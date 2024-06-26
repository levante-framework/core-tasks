import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { isTouchScreen } from '../../taskSetup';
import { mediaAssets } from '../../..';
import { replayButtonSvg, setupReplayAudio, taskStore } from '../../shared/helpers';

const instructionData = [
    {
        prompt: 'matrixReasoningInstruct1',
        image: 'matrixExample', // GIF?
        buttonText: 'continueButtonText',
    },
];
const replayButtonHtmlId = 'replay-btn-revisited';

export const instructions = instructionData.map(data => {
    return {
        type: jsPsychAudioMultiResponse,
        stimulus: () => mediaAssets.audio[data.prompt],
        prompt: () => {
            const t = taskStore().translations;
            return `<div class="lev-stimulus-container">
                        <button
                            id="${replayButtonHtmlId}"
                            class="replay"
                        >
                            ${replayButtonSvg}
                        </button>
                        <div class="lev-row-container instruction">
                            <p>${t[data.prompt]}</p>
                        </div>

                        ${data.video ? 
                            `<video
                                id='instruction-video'
                                autoplay
                                loop
                            >
                                <source
                                    src=${mediaAssets.video[data.video]}
                                    type='video/mp4'
                                />
                            </video>` :
                            `<img
                                src=${mediaAssets.images[data.image]}
                                alt='Instruction graphic'
                            />`
                        }
                        
                        ${data.bottomText ? 
                            `<footer id='footer'>
                                ${t[data.bottomText]}
                            </footer>`
                            : ''}
                    </div>`;
        },
        prompt_above_buttons: true,
        button_choices: ['Next'],
        button_html: () => {
            const t = taskStore().translations;
            return [
            `<button class="primary">
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
