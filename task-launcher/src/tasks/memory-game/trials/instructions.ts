import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
//@ts-ignore
import { jsPsych } from '../../taskSetup';
import { mediaAssets } from '../../..';
//@ts-ignore
import { PageStateHandler, PageAudioHandler, replayButtonSvg, setupReplayAudio } from '../../shared/helpers';
import { taskStore } from '../../../taskStore';

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
                        <div class="lev-stim-content-x-3">
                            ${data.video ? 
                                `<video class='instruction-video-small' autoplay loop>
                                    <source src=${mediaAssets.video[data.video]} type='video/mp4'>
                                </video>` :
                                `<img
                                    src=${mediaAssets.images[data.image as string]}
                                    alt='Instruction graphic'
                                />`
                            }
                        </div>                    
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
        keyboard_choices: 'NO_KEYS',
        post_trial_gap: 500,
        on_load: () => {
            const pageStateHandler = new PageStateHandler(data.prompt);
            setupReplayAudio(pageStateHandler);
        }, 
        on_finish: () => {
            jsPsych.data.addDataToLastTrial({
                audioButtonPresses: PageAudioHandler.replayPresses, 
                assessment_stage: 'instructions'
              });
        }
    }
})

export const reverseOrderPrompt = instructions.pop()
export const readyToPlay = instructions.pop()
