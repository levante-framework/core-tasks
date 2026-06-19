import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import {
  addExperimenterButtons,
  getParticipantUtilityButtonsHtml,
  PageAudioHandler,
  PageStateHandler,
  setupFullscreenButton,
  setupReplayAudio,
} from '../helpers';

const replayButtonHtmlId = 'replay-btn-revisited';

export const repeatInstructionsMessage = {
  type: jsPsychHtmlMultiResponse,
  data: () => {
    return {
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    const t = taskStore().translations;
    return `<div class="lev-stimulus-container">
                ${getParticipantUtilityButtonsHtml(replayButtonHtmlId)}
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
  on_load: () => {
    PageAudioHandler.playAudio(mediaAssets.audio.generalRepeatInstructions);

    const pageStateHandler = new PageStateHandler('generalRepeatInstructions', true);
    setupReplayAudio(pageStateHandler);
    addExperimenterButtons();
    setupFullscreenButton();
  },
  on_finish: () => {
    PageAudioHandler.stopAndDisconnectNode();
  },
};
