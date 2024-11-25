import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
// @ts-ignore
import { PageStateHandler, PageAudioHandler, replayButtonSvg, setupReplayAudio } from '../../shared/helpers';
// @ts-ignore
import { jsPsych } from '../../taskSetup';
import { taskStore } from '../../../taskStore';

const instructionData = [
    {
        prompt: 'inferenceIns',
    },
];
const replayButtonHtmlId = 'replay-btn-revisited';

export const instructions = instructionData.map(data => {
    return {
        type: jsPsychAudioMultiResponse,
        stimulus: () => mediaAssets.audio.inferenceInstructions ?? mediaAssets.audio.nullAudio,
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
                    </div>`;
        },
        prompt_above_buttons: true,
        button_choices: ['Continue'],
        button_html: () => {
            const t = taskStore().translations;
            return [
            `<button class="primary">
                Continue
            </button>`,
            ]
        },
        keyboard_choices: () => 'NO_KEYS',

        on_load: () => {
            const pageStateHandler = new PageStateHandler(data.prompt);
            setupReplayAudio(pageStateHandler);
        }, 
        on_finish: () => {
            jsPsych.data.addDataToLastTrial({
                audioButtonPresses: PageAudioHandler.replayPresses
              }); 
        }
    }
})
