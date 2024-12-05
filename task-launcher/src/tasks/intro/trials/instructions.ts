import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
// @ts-ignore
import { isTouchScreen, jsPsych } from '../../taskSetup';
import { mediaAssets } from '../../..';
// @ts-ignore
import { PageAudioHandler, PageStateHandler, replayButtonSvg, setupReplayAudio, taskStore } from '../../shared/helpers';

const instructionData = [
    {
        prompt: 'generalIntro1',
        image: 'avatarOwl', // GIF?
        buttonText: 'continueButtonText',
    },
    // prompt: 'generalIntro2', // "First, you get to choose a buddy to play along with you. ..."
    // prompt: 'generalIntro3', // "Now that you have your buddy, we want to explain how the games work."
    // prompt: 'pickBuddy',
    // images: ['avatar_owl', 'avatar_cat', 'avatar_penguin'],
    {
        prompt: 'generalIntro4',
        image: 'avatarOwl', // ToDo: replay button with arrow?
        buttonText: 'continueButtonText',
    },
    {
        prompt: 'generalIntro5',
        image: 'avatarOwl',
        buttonText: 'continueButtonText',
    },
]

// additional keyboard instructions for those not using a tablet
if (!isTouchScreen) {
    instructionData.push(
        {
            prompt: 'generalKeyboardInstructions',
            image: 'avatarOwl',
            buttonText: 'continueButtonText',
        }
    )
}

export const instructions = instructionData.map(data => {
    return {
        type: jsPsychHtmlMultiResponse,
        stimulus: () => {
            const t = taskStore().translations;
            return `
                <div class="lev-stimulus-container">
                    <button id="replay-btn-revisited" class="replay">
                        ${replayButtonSvg}
                    </button>
                    <div class="lev-row-container instruction-small">
                        <p>${t[data.prompt]}</p>
                    </div>
                    <div class="lev-stim-content-x-3">
                        <img
                            src=${mediaAssets.images[data.image]}
                            alt='Instruction graphic'
                        />
                    </div>
                </div>
            `;
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
            PageAudioHandler.playAudio(mediaAssets.audio[data.prompt]); 

            const pageStateHandler = new PageStateHandler(data.prompt);
            setupReplayAudio(pageStateHandler);
        },
        on_finish: () => {
            PageAudioHandler.stopAndDisconnectNode();
            
            jsPsych.data.addDataToLastTrial({
                audioButtonPresses: PageAudioHandler.replayPresses, 
                assessment_stage: 'instructions'
              });
            PageAudioHandler.stopAndDisconnectNode();
        }
    }
})
