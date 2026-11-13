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
import { createBubbleInstructionTrial } from '../helpers/createBubbleInstructionTrial';
import { placeBubblesAround, placeScaledBubbles, type Rect } from '../helpers/placeBubblesAround';

const driverObj = driver({
  disableActiveInteraction: false,
  popoverClass: 'driver-popover--hidden',
  allowClose: false,
  steps: [{ element: '#button0' }, { element: '#button1' }, { element: '#button2' }],
});

const BUBBLE_COUNT1 = 7;

// Old bubble.webp was 677×369 and was drawn inside a square of min(22vw, 22vh),
// so the art filled 369/677 of that square. The new file is square.
const BUBBLE_SCREEN_FRACTION = 0.22 * (369 / 677);

function screenUnit() {
  return Math.min(window.innerWidth, window.innerHeight) * BUBBLE_SCREEN_FRACTION;
}

function equalBubbles(field: Rect, obstacles: Rect[]) {
  const maxSize = screenUnit();
  const placed =
    placeBubblesAround(field, obstacles, BUBBLE_COUNT1, maxSize) ??
    placeBubblesAround(field, obstacles, BUBBLE_COUNT1, maxSize, 48, 0);
  return placed?.slots.map((slot) => ({ ...slot, size: placed.size })) ?? null;
}

// Small is 0.8 of the base size, big is 2.4 of it. The three medium bubbles sit between them.
const BIG_SMALL_BUBBLES = [
  { ratio: 2.4, required: true },
  { ratio: 0.8, required: true },
  { ratio: 1.5, required: false },
  { ratio: 1.5, required: false },
  { ratio: 1.5, required: false },
];

function bigAndSmallBubbles(field: Rect, obstacles: Rect[]) {
  const maxSmall = screenUnit();
  const ratios = BIG_SMALL_BUBBLES.map((bubble) => bubble.ratio);
  const placed =
    placeScaledBubbles(field, obstacles, ratios, maxSmall) ??
    placeScaledBubbles(field, obstacles, ratios, maxSmall, 48, 0);
  return placed?.map((bubble, index) => ({ ...bubble, required: BIG_SMALL_BUBBLES[index].required })) ?? null;
}

const bubblePoppingPracticeTrial = createBubbleInstructionTrial({
  prompt: () => (taskStore().inputCapability?.touch ? 'instructBubble1Touch' : 'instructBubble1Mouse'),
  placeBubbles: equalBubbles,
});

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
            <img src=${mediaAssets.images.bubble} style="width: min(${BUBBLE_SCREEN_FRACTION * 100}vw, ${BUBBLE_SCREEN_FRACTION * 100}vh)">
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

const pressBubblePracticeTrial = createBubbleInstructionTrial({
  prompt: () => (taskStore().inputCapability?.touch ? 'instructBubble5Touch' : 'instructBubble5Mouse'),
  placeBubbles: bigAndSmallBubbles,
});

export const pressBubblePractice = {
  timeline: [pressBubblePracticeTrial],
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
