import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { isTouchScreen, jsPsych } from '../../taskSetup';
import { mediaAssets } from '../../..';
import { replayButtonDiv, replayButtonDivId } from '../../shared/helpers';
import { overrideAudioTrialForReplayableAudio } from '../../shared/helpers/replayAudio';

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
]

export function getReadyToPlayInstruction() {
    const t = store.session.get('translations');
    const promptKey = 'memoryGameInstruct5';
    const promptAudio = mediaAssets.audio[promptKey];
    const promptText = t[promptKey];
    const buttonText = t['continueButtonText'];
    const video = undefined;
    const image = mediaAssets.images['catAvatar'];
    const bottomText = undefined;
    return getInstructionTrial(promptAudio, promptText, buttonText, video, image, bottomText);
}

export function getReverseOrderPromptInstruction() {
    const t = store.session.get('translations');
    const promptKey = 'memoryGameBackwardPrompt';
    const promptAudio = mediaAssets.audio[promptKey];
    const promptText = t[promptKey];
    const buttonText = t['continueButtonText'];
    const video = undefined;
    const image = mediaAssets.images['highlightedBlock'];
    const bottomText = t['memoryGameInstruct7'];
    return getInstructionTrial(promptAudio, promptText, buttonText, video, image, bottomText);
}

export function getInitialInstructionTrials() {
    const instructions = instructionData.map(data => {
        const t = store.session.get('translations');
        const promptAudio = mediaAssets.audio[data.prompt];
        const promptText = t[data.prompt];
        const buttonText = t[data.buttonText];
        const video = data.video ? mediaAssets.video[data.video] : undefined;
        const image = data.image ? mediaAssets.images[data.image] : undefined;
        const bottomText = data.bottomText ? t[data.bottomText] : undefined;
        return getInstructionTrial(promptAudio, promptText, buttonText, video, image, bottomText);
    });
    
    return instructions;
}

function getInstructionTrial(promptAudio, promptText, buttonText, video=undefined, image=undefined, bottomText=undefined) {
    if (video && image) throw new Error('Cannot have both video and image in instruction');
    else if (!video && !image) throw new Error('Must have either video or image in instruction');

    const trial = {
        type: jsPsychAudioMultiResponse,
        stimulus: promptAudio,
        prompt: `<div id='stimulus-container'>
                    ${replayButtonDiv}
                    <div id='prompt-container-text'>
                        <h1 id='prompt'>${promptText}</h1>
                    </div>

                    ${video ?
                        `<video id='instruction-video' autoplay loop>
                            <source src=${video} type='video/mp4'>
                        </video>`
                        : `<img id='instruction-graphic' src=${image} alt='Instruction graphic'/>`
                    }
                    
                    ${bottomText ? `<footer id='footer'>${bottomText}</footer>` : ''}
                </div>`,
        prompt_above_buttons: true,
        button_choices: ['Next'],
        button_html: `<button id='continue-btn'>${buttonText}</button>`,
        keyboard_choices: () => isTouchScreen ? 'NO_KEYS' : 'ALL_KEYS',
    }

    overrideAudioTrialForReplayableAudio(trial, jsPsych.pluginAPI, replayButtonDivId);
    return trial;
}
