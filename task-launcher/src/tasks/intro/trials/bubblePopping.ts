import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { driver } from 'driver.js';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import {
  addExperimenterButtons,
  getParticipantUtilityButtonsHtml,
  PageAudioHandler,
  setupFullscreenButton,
  wrapListeners,
} from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';
import { spreadBubbles } from '../helpers/bubbleHelpers';

const driverObj = driver({
  disableActiveInteraction: false,
  advanceOnClick: true,
  popoverClass: 'driver-popover--hidden',
  allowClose: false,
  steps: [{ element: '#button0' }, { element: '#button1' }, { element: '#button2' }],
});

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

    const bubbles = Array.from(document.getElementById('bubble-container')?.children as unknown as HTMLButtonElement[]);
    let remainingBubbles = bubbles.length;

    bubbles.forEach((bubble) => {
      bubble.addEventListener('click', () => {
        PageAudioHandler.playAudio(mediaAssets.audio.pop, popAudioConfig);
        bubble.style.visibility = 'hidden';

        remainingBubbles--;

        if (remainingBubbles === 0) {
          jsPsych.finishTrial();
        }
      });

      bubble.addEventListener('dragstart', (event) => {
        event.preventDefault();
      });
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

const buttonPressPracticeTrial = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const t = taskStore().translations;

    return `
      <div class="lev-stimulus-container">
        <div class="lev-response-row multi-4" style="gap:5vw; align-items:center">
            <button id="button0" class="secondary">3</button>
            <button id="button1" class="primary"> ${t.continueButtonText}</button>
            <button id="button2" class="image-large"> 
              <img src=${mediaAssets.images['smilingFace@2x']}>
            </button>
          </div>
      </div>
    `;
  },
  keyboard_choices: 'NO_KEYS',
  on_load: () => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.lev-response-row button'));

    driverObj.drive();

    let remainingButtons = buttons.length;
    buttons.forEach((button) => {
      wrapListeners(button, () => {
        PageAudioHandler.playAudio(mediaAssets.audio.select);

        button.style.visibility = 'hidden';

        remainingButtons--;
        if (remainingButtons === 0) {
          jsPsych.finishTrial();
        }
      });
    });
  },
  on_finish: () => {
    driverObj.destroy();

    PageAudioHandler.stopAndDisconnectNode();

    jsPsych.data.addDataToLastTrial({
      audioButtonPresses: PageAudioHandler.replayPresses,
      assessment_stage: 'instructions',
    });
    PageAudioHandler.stopAndDisconnectNode();
  },
};

export const buttonPressPractice = {
  timeline: [buttonPressPracticeTrial],
  conditional_function: () => taskStore().bubblePractice === true,
};
