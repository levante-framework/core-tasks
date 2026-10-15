import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import {
  addExperimenterButtons,
  enableOkButton,
  getParticipantUtilityButtonsHtml,
  PageAudioHandler,
  PageStateHandler,
  setupFullscreenButton,
  setupReplayAudio,
} from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';
import { resolveMemoryGamePrompt } from '../helpers/resolveMemoryGamePrompt';

let setPromptDurations = false;

const replayButtonHtmlId = 'replay-btn-revisited';

/**
 * Builds an instruction screen from a corpus row's prompt and media.
 * @param promptKey camelized audio/translation key of the prompt
 * @param mediaKey camelized key of an image or video (videos are checked first)
 * @param displayPromptKeys prompts played before display trials; their durations are measured on the first screen
 */
export function buildInstructionScreen(promptKey: string, mediaKey: string, displayPromptKeys: string[]) {
  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const t = taskStore().translations;
      const resolvedPromptKey = resolveMemoryGamePrompt(promptKey);
      const isVideo = mediaKey in mediaAssets.video;
      const mediaSrc = isVideo ? mediaAssets.video[mediaKey] : mediaAssets.images[mediaKey];
      return `<div class="lev-stimulus-container">
                        ${getParticipantUtilityButtonsHtml(replayButtonHtmlId)}
                        <div class="lev-row-container instruction">
                            <p>${t[resolvedPromptKey]}</p>
                        </div>
                        <div class="lev-stim-content-x-3">
                            ${
                              isVideo
                                ? `<video class='instruction-video-small' autoplay loop>
                                    <source src=${mediaSrc} type='video/mp4'>
                                </video>`
                                : `<img
                                    src=${mediaSrc}
                                    alt="Image not loading ${mediaSrc}. Please continue the task."
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
        `<button class="primary" disabled>
                  ${t.continueButtonText}
          </button>`,
      ];
    },
    keyboard_choices: 'NO_KEYS',
    post_trial_gap: 500,
    on_load: async () => {
      const resolvedPromptKey = resolveMemoryGamePrompt(promptKey);
      const audioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: false,
          maxRepetitions: 2,
        },
        onEnded: () => {
          enableOkButton();
        },
      };

      PageAudioHandler.playAudio(resolvedPromptKey, audioConfig);
      const pageStateHandler = new PageStateHandler(resolvedPromptKey, true);
      setupReplayAudio(pageStateHandler);
      addExperimenterButtons();
      setupFullscreenButton();

      // hide toast if it is there
      const toast = document.getElementById('lev-toast-default');
      if (toast) {
        toast.classList.remove('show');
      }

      // set the display prompt durations here, since awaiting promise during a display trial is not possible in the jsPsych plugin
      if (!setPromptDurations) {
        setPromptDurations = true;

        const displayPromptDurations: Record<string, number> = {};
        for (const key of displayPromptKeys) {
          const duration = mediaAssets.audio[key] && (await PageAudioHandler.getAudioDuration(mediaAssets.audio[key]));
          if (duration) {
            displayPromptDurations[key] = duration;
          }
        }

        taskStore('displayPromptDurations', displayPromptDurations);
      }
    },
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();
      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
    },
  };
}
