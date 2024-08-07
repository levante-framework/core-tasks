import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { isTouchScreen } from '../../taskSetup';
import { mediaAssets } from '../../..';
import { PageStateHandler, replayButtonSvg, setupReplayAudio, taskStore } from '../../shared/helpers';

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

export const instructions = instructionData.map(data => {
    return {
        type: jsPsychAudioMultiResponse,
        stimulus: () => mediaAssets.audio[data.prompt],
        prompt: () => {
            const t = taskStore().translations;
            return `<div id='stimulus-container'>
                        <button id="replay-btn-revisited" class="replay">
                            ${replayButtonSvg}
                        </button>
                        <div id='prompt-container-text'>
                            <h1 id='prompt'>${t[data.prompt]}</h1>
                        </div>

                        <img id='instruction-graphic' src=${mediaAssets.images[data.image]} alt='Instruction graphic'/>
                        
                        ${data.bottomText ? `<footer id='footer'>${t[data.bottomText]}</footer>` : ''}
                    </div>`;
        },
        prompt_above_buttons: true,
        button_choices: ['Next'],
        button_html: () => {
            const t = taskStore().translations;
            return [
            `<button id='continue-btn'>
                ${t[data.buttonText]}
            </button>`,
            ]
        },
        keyboard_choices: () => isTouchScreen ? 'NO_KEYS' : 'ALL_KEYS',
        on_load: () => {
            const pageStateHandler = new PageStateHandler(data.prompt);
            setupReplayAudio(pageStateHandler);
        }
    }
})
