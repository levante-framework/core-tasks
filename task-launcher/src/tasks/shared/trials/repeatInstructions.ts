import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
// @ts-ignore
import { replayButtonSvg, PageStateHandler, setupReplayAudio } from '../helpers';
import { taskStore } from '../../../taskStore';

const replayButtonHtmlId = 'replay-btn-revisited';

export const repeatInstructionsMessage = {
    type: jsPsychAudioMultiResponse,
    data: () => {
      return {
        assessment_stage: 'instructions',
      };
    },
    stimulus: () => mediaAssets.audio.generalRepeatInstructions,
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
                  <p>${t.generalRepeatInstructions}</p>
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
    trial_ends_after_audio: false,
    response_allowed_while_playing: false,
    on_load: () => {
      const pageStateHandler = new PageStateHandler('generalRepeatInstructions');
      setupReplayAudio(pageStateHandler);
  }
};