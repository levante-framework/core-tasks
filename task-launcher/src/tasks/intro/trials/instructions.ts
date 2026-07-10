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
import { isTouchScreen, jsPsych } from '../../taskSetup';

const instructionData = [
  {
    prompt: 'generalIntro1',
    image: 'avatarOwl', // GIF?
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
  },
  {
    prompt: 'instructBubblePoppingMouse',
    resolvePrompt: () =>
      taskStore().inputCapability?.touch
        ? 'instructBubblePoppingTouch'
        : 'instructBubblePoppingMouse',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
  },
  {
    prompt: 'feedbackGoodJob',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    autoAdvanceWhenBubblePractice: true,
  },
  {
    prompt: 'instructButtonIntro',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
    pulseOkOnEnable: true,
  },
  {
    prompt: 'generalIntro4',
    image: 'avatarOwl', // ToDo: replay button with arrow?
    buttonText: 'continueButtonText',
  },
  {
    prompt: 'generalIntro5',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
  },
];

// additional keyboard instructions for those not using a tablet
if (!isTouchScreen) {
  instructionData.push({
    prompt: 'generalKeyboardInstructions',
    image: 'avatarOwl',
    buttonText: 'continueButtonText',
  });
}

const instructions = instructionData.map((data) => {
  const getPrompt = () => data.resolvePrompt?.() ?? data.prompt;
  const shouldAutoAdvanceOnAudioEnd = () =>
    data.autoAdvanceWhenBubblePractice && taskStore().bubblePractice === true;

  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const t = taskStore().translations;
      const prompt = getPrompt();
      return `
        <div class="lev-stimulus-container">
            ${getParticipantUtilityButtonsHtml('replay-btn-revisited')}
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
          } else if (data.pulseOkOnEnable) {
            enableOkButton();
            const okButton = document.querySelector('.primary') as HTMLButtonElement;
            if (okButton) {
              okButton.style.animation = 'pulse 1s infinite';
            }
          } else {
            enableOkButton();
          }
        },
      };

      PageAudioHandler.playAudio((mediaAssets.audio[prompt] || mediaAssets.audio.inputAudioCue), audioConfig);

      const pageStateHandler = new PageStateHandler(prompt, true);
      setupReplayAudio(pageStateHandler);
      addExperimenterButtons();
      setupFullscreenButton();
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
