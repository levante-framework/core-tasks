import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { jsPsych } from '../../taskSetup';
import { mediaAssets } from '../../..';
import {
  addExperimenterButtons,
  PageAudioHandler,
  getParticipantUtilityButtonsHtml,
  setupFullscreenButton,
} from '../../shared/helpers';
import { spreadBubbles } from '../helpers/bubbleHelpers';

const bubblePoppingPracticeTrial = {
      type: jsPsychHtmlMultiResponse,
      stimulus: () => {
        return `
          <div class="lev-stimulus-container">
              <div id="bubble-container" class="image-grid-x4">
                <button class="img-transparent float"> 
                  <img src=${mediaAssets.images.bubble}>
                </button>
                <button class="img-transparent float"> 
                  <img src=${mediaAssets.images.bubble}>
                </button>
                <button class="img-transparent float"> 
                  <img src=${mediaAssets.images.bubble}>
                </button>
                <button class="img-transparent float"> 
                  <img src=${mediaAssets.images.bubble}>
                </button>
                <button class="img-transparent float"> 
                  <img src=${mediaAssets.images.bubble}>
                </button>
                <button class="img-transparent float"> 
                  <img src=${mediaAssets.images.bubble}>
                </button>
                <button class="img-transparent float"> 
                  <img src=${mediaAssets.images.bubble}>
                </button>
              </div>
          </div>
        `;
      },
      keyboard_choices: 'NO_KEYS',
      on_load: () => {
        addExperimenterButtons();
        setupFullscreenButton();

        const popAudioConfig: AudioConfigType = {
            restrictRepetition: {
              enabled: false,
              maxRepetitions: 2,
            },
          };

        const bubbles = Array.from(document.getElementById("bubble-container")?.children as unknown as HTMLButtonElement[]);
        let remainingBubbles = bubbles.length;

        bubbles.forEach((bubble) => {
            bubble.addEventListener('click', () => {
                PageAudioHandler.playAudio(mediaAssets.audio.pop, popAudioConfig);
                bubble.style.visibility = 'hidden';

                remainingBubbles --;

                if (remainingBubbles === 0) {
                    jsPsych.finishTrial();
                }
            });

            bubble.addEventListener('dragstart', (event) => {
              event.preventDefault();
            })
        });

        spreadBubbles(bubbles);
      },
      on_finish: () => {
        PageAudioHandler.stopAndDisconnectNode();
  
        jsPsych.data.addDataToLastTrial({
          audioButtonPresses: PageAudioHandler.replayPresses,
          assessment_stage: 'instructions',
        });
        PageAudioHandler.stopAndDisconnectNode();
      },
    };

export const bubblePoppingPractice = {
  timeline: [bubblePoppingPracticeTrial],
  conditional_function: () => taskStore().bubblePractice === true,
};
