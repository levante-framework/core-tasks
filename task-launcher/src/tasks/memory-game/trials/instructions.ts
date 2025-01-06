import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
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
        prompt: 'memoryGameInstruct6', 
        image: 'catAvatar',
        buttonText: 'continueButtonText'
    },
    {
        prompt: 'memoryGameBackwardPrompt',
        video: 'selectSequenceReverse',
        buttonText: 'continueButtonText',
    },
]

const replayButtonHtmlId = 'replay-btn-revisited'; 

export const instructions = instructionData.map(data => {
    return {
        type: jsPsychHtmlMultiResponse,
        stimulus: () => {
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
            PageAudioHandler.playAudio(mediaAssets.audio[data.prompt]);
            const pageStateHandler = new PageStateHandler(data.prompt);
            setupReplayAudio(pageStateHandler);

            // hide toast if it is there 
            const toast = document.getElementById('lev-toast-default');
            if (toast) {
                toast.classList.remove('show'); 
            }
        }, 
        on_finish: () => {
            PageAudioHandler.stopAndDisconnectNode();
            jsPsych.data.addDataToLastTrial({
                audioButtonPresses: PageAudioHandler.replayPresses, 
                assessment_stage: 'instructions'
              });
            
            if (data.prompt === 'memoryGameBackwardPrompt') {
                taskStore('numIncorrect', 0);
            }
        }
    }
})

export const reverseOrderPrompt = instructions.pop()
export const reverseOrderInstructions = instructions.pop()
export const readyToPlay = instructions.pop()
