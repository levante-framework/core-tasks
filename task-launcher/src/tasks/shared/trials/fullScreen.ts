import jsPsychFullScreen from '@jspsych/plugin-fullscreen';
import fscreen from 'fscreen';
import { taskStore } from '../../../taskStore';
import { isTouchScreen } from '../../taskSetup';
import { PageAudioHandler } from '../helpers/audioHandler';

const isCypress = typeof window !== 'undefined' && (window as any).Cypress;

export const enterFullscreen = {
  type: jsPsychFullScreen,
  // force fullscreen on a touchscreen so that audio context can be unlocked
  fullscreen_mode: (!isCypress && !!fscreen.fullscreenEnabled) || isTouchScreen,
  message: () => {
    const t = taskStore().translations;
    return `<div class="lev-row-container header">
        <p>${t.generalFullscreen || 'Switch to full screen mode'}</p>
      </div>
      `;
  },
  delay_after: 0,
  button_label: () => `${taskStore().translations.continueButtonText || 'Continue'}`,
  on_load: () => {
    const continueButton = document.getElementById('jspsych-fullscreen-btn');
    if (continueButton) {
      continueButton.id = 'dummy';
      continueButton.classList.add('primary');
    }

    if (isTouchScreen) {
      continueButton?.addEventListener('click', () => {
        PageAudioHandler.unlockAudioContext();
      }), { once: true };
      continueButton?.addEventListener('touchend', () => {
        PageAudioHandler.unlockAudioContext();
      }), { once: true };
    }
  },
  on_start: () => {
    document.body.style.cursor = 'default';
  },
};

export const ifNotFullscreen = {
  timeline: [enterFullscreen],
  conditional_function: () => !isCypress && fscreen.fullscreenElement === null,
};

export const exitFullscreen = {
  type: jsPsychFullScreen,
  fullscreen_mode: false,
  delay_after: 0,
};
