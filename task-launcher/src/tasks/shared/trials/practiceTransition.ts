import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
// @ts-ignore
import { replayButtonSvg, PageStateHandler, setupReplayAudio, PageAudioHandler } from '../helpers';
import { taskStore } from '../../../taskStore';

const replayButtonHtmlId = 'replay-btn-revisited';

export const practiceTransition = {
    timeline: [{
        type: jsPsychHtmlMultiResponse,
        data: () => {
            return {
                assessment_stage: 'instructions',
            };
        },
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
                  <p>${t.generalYourTurn}</p>
                </div>
                <div class="lev-stim-content-x-3">
                    <img
                        src=${mediaAssets.images.rocket}
                        alt='Instruction graphic'
                    />
                </div>
              </div>`;
        },
        prompt_above_buttons: true,
        button_choices: ['Continue'],
        button_html: () => {
            const t = taskStore().translations;
            return `<button class="primary">${t.continueButtonText}</button>`;
        },
        keyboard_choices: 'NO_KEYS',
        post_trial_gap: 350,
        on_load: () => {
            PageAudioHandler.playAudio(mediaAssets.audio.generalYourTurn);

            const pageStateHandler = new PageStateHandler('generalYourTurn', true);
            setupReplayAudio(pageStateHandler);
        }, 
        on_finish: () => {
            PageAudioHandler.stopAndDisconnectNode();
        }, 
    }],
    conditional_function: () => {
        if (taskStore().runCat) {
            return true; 
        }
  
        // only run this if coming out a practice phase into a test phase
        const runTrial: boolean = 
        taskStore().nextStimulus.trialType != "instructions" && 
        taskStore().nextStimulus.assessmentStage != "practice_response" && 
        !taskStore().testPhase; 

        console.log(runTrial);
        if (runTrial) {
            taskStore("testPhase", true)
        }
    
        return runTrial;
    }
};