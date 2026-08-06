import jsPsychFullScreen from '@jspsych/plugin-fullscreen';
import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import fscreen from 'fscreen';
import { taskStore } from '../../../taskStore';
import { setupInputDetection } from '../../../utils/detectInput';
import { jsPsych } from '../../taskSetup';

export const enterFullscreen = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const t = taskStore().translations;
    return `<div class="lev-row-container header">
        <p>${t.generalFullscreen}</p>
      </div>
      `;
  },
  button_choices: [''], // Must not be empty for the button_html to render
  keyboard_choices: 'NO_KEYS',
  button_html: () => `<button class="primary">${taskStore().translations.continueButtonText}</button>`,
  response_ends_trial: false, // Disable automatic trial advancement
  on_load: () => {
    // Capture the start time so we can report the response time (rt) below.
    const startTime = performance.now();

    // Detect the user's input capability.
    const inputDetector = setupInputDetection();
    taskStore('inputCapability', inputDetector.capability);

    // We listen for both 'touchend' and 'click' so the button responds on the
    // widest range of devices. On touch, the two can fire for a single tap:
    // browsers synthesize a 'click' after 'touchend'. Modern mobile browsers do
    // this reliably, but older ones are inconsistent, which is why we can't rely
    // on 'click' alone and keep the 'touchend' listener too. The `handled` flag
    // ensures the trial only advances once when both fire for the same tap.
    const continueButton = document.querySelector<HTMLButtonElement>('#jspsych-html-multi-response-btngroup button');
    let handled = false;
    const handleContinue = async () => {
      if (handled) return;
      handled = true;
      continueButton?.removeEventListener('click', handleContinue);
      continueButton?.removeEventListener('touchend', handleContinue);

      try {
        // Resume the audio context so the next trial's audio can autoplay.
        // NB: browsers (notably Safari) only honor resume() when it is
        // *called* synchronously during a user gesture. Awaiting it doesn't
        // change that (the call still happens synchronously here) but it holds
        // off advancing until the context is actually running, which narrows
        // the race with the next trial's audio autoplay. The key constraint is
        // that nothing may be awaited *before* this line: after the first
        // await the handler continues on a later microtask, by which point the
        // gesture's activation has expired and resume() is ignored.
        await jsPsych.pluginAPI.audioContext()?.resume();
      } finally {
        // Request fullscreen.
        if (fscreen.fullscreenEnabled) {
          fscreen.requestFullscreen(document.documentElement);
        }
        // Manually advance the trial.
        jsPsych.finishTrial({ success: true, rt: Math.round(performance.now() - startTime) });
      }
    };
    continueButton?.addEventListener('click', handleContinue);
    continueButton?.addEventListener('touchend', handleContinue);
  },
  on_start: () => {
    document.body.style.cursor = 'default';
  },
};

export const exitFullscreen = {
  type: jsPsychFullScreen,
  fullscreen_mode: false,
  delay_after: 0,
};
