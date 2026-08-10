import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { driver } from 'driver.js';
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

const buttonIntroDriverObj = driver({
  disableActiveInteraction: false,
  advanceOnClick: true,
  popoverClass: 'driver-popover--hidden',
  allowClose: false,
  steps: [{ element: '#replay-btn-revisited' }, { element: '.primary' }],
});

const instructionData = [
  {
    prompt: 'generalIntro1',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
    includeReplayButton: false,
  },
  {
    prompt: 'instructBubble1Mouse',
    resolvePrompt: () => (taskStore().inputCapability?.touch ? 'instructBubble1Touch' : 'instructBubble1Mouse'),
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
    includeReplayButton: false,
  },
  {
    prompt: 'instructBubble2',
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
    prompt: 'feedbackGoodJob',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
    includeReplayButton: false,
  },
  {
    prompt: 'instructBubble4',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
    includeReplayButton: false,
  },
  {
    prompt: 'generalIntro4',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    driveButtonIntroWhenBubblePractice: true,
    includeReplayButton: true,
  },
];

const instructions = instructionData.map((data) => {
  const getPrompt = () => data.resolvePrompt?.() ?? data.prompt;
  const shouldAutoAdvanceOnAudioEnd = () => data.autoAdvanceWhenBubblePractice && taskStore().bubblePractice === true;
  const shouldDriveButtonIntro = () => data.driveButtonIntroWhenBubblePractice && taskStore().bubblePractice === true;

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
      const prompt = getPrompt();
      const audioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: true,
          maxRepetitions: 2,
        },
        onEnded: () => {
          if (shouldAutoAdvanceOnAudioEnd()) {
            setTimeout(() => {
              jsPsych.finishTrial();
            }, 2000);
          } else {
            enableOkButton();
            if (shouldDriveButtonIntro()) {
              buttonIntroDriverObj.drive();
            }
          }
        },
      };

      PageAudioHandler.playAudio(mediaAssets.audio[prompt] || mediaAssets.audio.inputAudioCue, audioConfig);

      if (data.includeReplayButton) {
        const pageStateHandler = new PageStateHandler(prompt, true);
        setupReplayAudio(pageStateHandler);
      }

      addExperimenterButtons();
      setupFullscreenButton();
    },
    on_finish: () => {
      if (shouldDriveButtonIntro()) {
        buttonIntroDriverObj.destroy();
      }

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
export const bubblePoppingInstruction = {
  timeline: [instructions.shift()],
  conditional_function: () => taskStore().bubblePractice === true,
};
export const bubblePracticeFeedbackInstruction = {
  timeline: [instructions.shift()],
  conditional_function: () => taskStore().bubblePractice === true,
};
export const buttonIntroInstruction = {
  timeline: [instructions.shift()],
  conditional_function: () => taskStore().bubblePractice === true,
};
export const remainingInstructions = instructions;
