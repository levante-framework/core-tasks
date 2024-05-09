import jsPsychFullScreen from '@jspsych/plugin-fullscreen';
import fscreen from 'fscreen';
import store from 'store2';

export const enterFullscreen = {
  type: jsPsychFullScreen,
  fullscreen_mode: true,
  message: () => {
    const t = store.session.get('translations');
    return `<div id='fullscreen'>
        <h1>${t.generalFullscreen || 'Switch to full screen mode'}</h1>
      </div>`;
  },
  delay_after: 0,
  button_label: () => `${store.session.get('translations').continueButtonText || 'Continue'}`,
  on_start: () => {
    document.body.style.cursor = 'default';
  },
};

export const ifNotFullscreen = {
  timeline: [enterFullscreen],
  conditional_function: () => fscreen.fullscreenElement === null,
};

export const exitFullscreen = {
  type: jsPsychFullScreen,
  fullscreen_mode: false,
  delay_after: 0,
};
