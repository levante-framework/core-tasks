import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { driver } from 'driver.js';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';
import {
  addExperimenterButtons,
  enableOkButton,
  getParticipantUtilityButtonsHtml,
  PageAudioHandler,
  setupFullscreenButton,
  wrapListeners,
} from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';
import { spreadBubbles } from '../helpers/bubbleHelpers';

const driverObj = driver({
  disableActiveInteraction: false,
  popoverClass: 'driver-popover--hidden',
  allowClose: false,
  steps: [{ element: '#button0' }, { element: '#button1' }, { element: '#button2' }],
});

const BUBBLE_COUNT = 7;

const bubblePoppingPracticeTrial = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    return `
          <div class="lev-stimulus-container">
              <div id="bubble-container" class="image-grid-x4">
                ${Array.from(
                  { length: BUBBLE_COUNT },
                  () => `<button class="img-transparent float"> 
                          <img src=${mediaAssets.images.bubble}>
                        </button>`,
                ).join('')}
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
    let remainingBubbles = BUBBLE_COUNT;

    bubbles.forEach((bubble) => {
      wrapListeners(bubble, () => {
        console.log('pop');
        PageAudioHandler.playAudio('pop', popAudioConfig);
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
  },
};

export const bubblePoppingPractice = {
  timeline: [bubblePoppingPracticeTrial],
  conditional_function: () => taskStore().bubblePractice === true,
};

const bubbleOverButtonDriverObj = driver({
  disableActiveInteraction: false,
  advanceOnClick: true,
  popoverClass: 'driver-popover--hidden',
  allowClose: false,
});

const bubbleOverButtonPracticeTrial = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const t = taskStore().translations;
    const prompt = 'instructBubble2';

    return `
      <div class="lev-stimulus-container">
        ${getParticipantUtilityButtonsHtml('replay-btn-revisited', false)}
        <div class="lev-row-container instruction-small">
          <p>${t[prompt]}</p>
        </div>
        <div class="lev-stim-content-x-3">
          <img
            src=${mediaAssets.images.avatarOwl}
            alt='Instruction graphic'
          />
        </div>
      </div>
    `;
  },
  prompt_above_buttons: true,
  button_choices: ['Next'],
  button_html: () => {
    const t = taskStore().translations;

    return [
      `<div id="bubble-button-stack" class="stack-overlay">
        <button class="primary" id="ok-button" disabled>${t.continueButtonText}</button>
          <button class="img-transparent float" style="pointer-events: none"> 
            <img src=${mediaAssets.images.bubble}>
          </button>
      </div>`,
    ];
  },
  keyboard_choices: 'NO_KEYS',
  on_load: () => {
    const prompt = 'instructBubble2';

    addExperimenterButtons();
    setupFullscreenButton();

    const audioConfig: AudioConfigType = {
      restrictRepetition: {
        enabled: true,
        maxRepetitions: 2,
      },
      onEnded: () => {
        enableOkButton();
        bubbleOverButtonDriverObj.highlight({ element: '#ok-button' });
      },
    };

    PageAudioHandler.playAudio(prompt, audioConfig);
  },
  on_finish: () => {
    bubbleOverButtonDriverObj.destroy();

    PageAudioHandler.stopAndDisconnectNode();

    jsPsych.data.addDataToLastTrial({
      audioButtonPresses: PageAudioHandler.replayPresses,
      assessment_stage: 'instructions',
    });
  },
};

export const bubbleOverButtonPractice = {
  timeline: [bubbleOverButtonPracticeTrial],
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

    let buttonsEnabled = true;
    let remainingButtons = buttons.length;
    buttons.forEach((button) => {
      wrapListeners(button, () => {
        if (!buttonsEnabled) {
          return;
        }

        driverObj.moveNext();

        buttonsEnabled = false;
        setTimeout(() => {
          buttonsEnabled = true;
        }, 500);

        PageAudioHandler.playAudio('select');

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
  },
};

export const buttonPressPractice = {
  timeline: [buttonPressPracticeTrial],
  conditional_function: () => taskStore().bubblePractice === true,
};
