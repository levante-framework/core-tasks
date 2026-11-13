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

const REPLAY_ARROW_ID = 'replay-point-arrow';
// Tip of visual/intro/arrow-icon.webp, which points up and to the right.
const ARROW_TIP_X = 737 / 1024;
const ARROW_TIP_Y = 269 / 1024;

function showReplayArrow() {
  const replay = document.getElementById('replay-btn-revisited');
  const src = mediaAssets.images.arrowIcon;
  if (!replay || !src) return;

  document.getElementById(REPLAY_ARROW_ID)?.remove();
  const arrow = document.createElement('img');
  arrow.id = REPLAY_ARROW_ID;
  arrow.className = 'replay-point-arrow';
  arrow.src = src;
  arrow.alt = '';
  document.body.appendChild(arrow);

  const rect = replay.getBoundingClientRect();
  const size = rect.width * 1.85;
  const nudge = Math.round(rect.width * 0.28);
  const tipX = rect.left - nudge * 0.6;
  const tipY = rect.bottom + nudge * 0.6;
  arrow.style.width = `${size}px`;
  arrow.style.height = `${size}px`;
  arrow.style.left = `${tipX - size * ARROW_TIP_X}px`;
  arrow.style.top = `${tipY - size * ARROW_TIP_Y}px`;
  arrow.style.setProperty('--replay-arrow-nudge', `${nudge}px`);
}

function removeReplayArrow() {
  document.getElementById(REPLAY_ARROW_ID)?.remove();
}

const instructionData = [
  {
    prompt: 'generalIntro1',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
    includeReplayButton: false,
  },
  {
    prompt: 'feedbackGoodJob',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
    includeReplayButton: false,
  },
  {
    prompt: 'instructBubble3',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
    includeReplayButton: false,
  },
  {
    prompt: 'instructBubble4',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    enableButtonAfterAudioMs: 1000,
    includeReplayButton: false,
  },
  {
    prompt: 'generalIntro4',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    pointAtReplayWhenBubblePractice: true,
    includeReplayButton: true,
  },
];

const instructions = instructionData.map((data) => {
  const getPrompt = () => data.prompt;
  const shouldAutoAdvanceOnAudioEnd = () => data.autoAdvanceWhenBubblePractice && taskStore().bubblePractice === true;
  const shouldPointAtReplay = () => data.pointAtReplayWhenBubblePractice && taskStore().bubblePractice === true;
  let advanceTimeout: ReturnType<typeof setTimeout> | undefined;
  let trialOpen = false;

  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const t = taskStore().translations;
      const prompt = getPrompt();

      return `
        <div class="lev-stimulus-container">
            ${getParticipantUtilityButtonsHtml('replay-btn-revisited', data.includeReplayButton)}
            <div class="lev-row-container instruction-small">
                <p>${t[prompt]}</p>
            </div>
            <div class="lev-stim-content-x-3">
                <img
                  src=${mediaAssets.images[data.image]}
                  alt='Instruction graphic'
                />
            </div>
        </div>
      `;
    },
    prompt_above_buttons: true,
    button_choices: () => (shouldAutoAdvanceOnAudioEnd() ? [] : ['Next']),
    button_html: () => {
      if (shouldAutoAdvanceOnAudioEnd()) {
        return;
      }

      const t = taskStore().translations;
      return [
        `<button class="primary" disabled>
                ${t[data.buttonText]}
            </button>`,
      ];
    },
    keyboard_choices: 'NO_KEYS',
    on_load: () => {
      trialOpen = true;
      const prompt = getPrompt();
      const audioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: true,
          maxRepetitions: 2,
        },
        onEnded: () => {
          if (!trialOpen) return;
          if (shouldAutoAdvanceOnAudioEnd()) {
            advanceTimeout = setTimeout(() => {
              if (!trialOpen) return;
              jsPsych.finishTrial();
            }, 2000);
            return;
          }

          const enableButton = () => {
            if (!trialOpen) return;
            enableOkButton();
          };
          const enableDelay =
            'enableButtonAfterAudioMs' in data && typeof data.enableButtonAfterAudioMs === 'number'
              ? data.enableButtonAfterAudioMs
              : 0;
          if (enableDelay > 0) {
            advanceTimeout = setTimeout(enableButton, enableDelay);
          } else {
            enableButton();
          }
        },
      };

      PageAudioHandler.playAudio(prompt, audioConfig);
      if (data.includeReplayButton) {
        const pageStateHandler = new PageStateHandler(prompt, true);
        setupReplayAudio(pageStateHandler);
      }

      addExperimenterButtons();
      setupFullscreenButton();
      if (shouldPointAtReplay()) {
        showReplayArrow();
      }
    },
    on_finish: () => {
      trialOpen = false;
      clearTimeout(advanceTimeout);
      removeReplayArrow();

      PageAudioHandler.stopAndDisconnectNode();

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
      PageAudioHandler.stopAndDisconnectNode();
    },
  };
});

export const firstInstruction = instructions.shift();
export const bubblePracticeFeedbackInstruction = {
  timeline: [instructions.shift()],
  conditional_function: () => taskStore().bubblePractice === true,
};
export const buttonIntroInstruction = {
  timeline: [instructions.shift()],
  conditional_function: () => taskStore().bubblePractice === true,
};
export const bubblePracticeOutro = {
  timeline: [instructions.shift()],
  conditional_function: () => taskStore().bubblePractice === true,
};
export const remainingInstructions = instructions;
