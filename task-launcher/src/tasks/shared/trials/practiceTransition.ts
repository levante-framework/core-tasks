import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { replayButtonSvg, PageStateHandler, setupReplayAudio, PageAudioHandler, camelize } from '../helpers';
import { taskStore } from '../../../taskStore';
import { pulseOkButton } from '../helpers/pulseOkButton';

const replayButtonHtmlId = 'replay-btn-revisited';

export const practiceTransition = (getPrompt?: () => string, forceRun = false) => {
  return {
    timeline: [
      {
        type: jsPsychHtmlMultiResponse,
        data: () => {
          return {
            assessment_stage: 'instructions',
          };
        },
        stimulus: () => {
          const imageSrc = mediaAssets.images['rocket@2x'];
          const t = taskStore().translations;
          let textKey = 'generalYourTurn';

          if (getPrompt) {
            textKey = getPrompt();
          }

          const promptText = t[camelize(textKey)];

          return `<div class="lev-stimulus-container">
                  <button
                    id="${replayButtonHtmlId}"
                    class="replay"
                  >
                  ${replayButtonSvg}
                  </button>
                  <div class="lev-row-container instruction">
                    <p>${promptText}</p>
                  </div>
                  <div class="lev-stim-content-x-3">
                      <img
                          src=${imageSrc}
                          alt="Image not loading: ${imageSrc}. Please continue the task."
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
          let audioKey = 'generalYourTurn';
          if (getPrompt) {
            audioKey = getPrompt();
          }

          const audioConfig: AudioConfigType = {
            restrictRepetition: {
              enabled: false,
              maxRepetitions: 2,
            },
            onEnded: () => {
              setTimeout(() => pulseOkButton(), 3000);
            },
          };
          
          PageAudioHandler.playAudio(mediaAssets.audio[camelize(audioKey)], audioConfig);

          const pageStateHandler = new PageStateHandler(camelize(audioKey), true);
          setupReplayAudio(pageStateHandler);
        },
        on_finish: () => {
          PageAudioHandler.stopAndDisconnectNode();
        },  
      },
    ],
    conditional_function: () => {
      if (taskStore().runCat || forceRun) {
        return true;
      }

      // only run this if coming out a practice phase into a test phase
      const runTrial: boolean =
        taskStore().nextStimulus.trialType !== 'instructions' &&
        taskStore().nextStimulus.assessmentStage !== 'practice_response' &&
        !taskStore().testPhase;

      if (runTrial) {
        taskStore('testPhase', true);
      }

      return runTrial;
    },
  };
};
