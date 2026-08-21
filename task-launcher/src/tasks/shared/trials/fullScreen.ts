import jsPsychFullScreen from '@jspsych/plugin-fullscreen';
import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import fscreen from 'fscreen';
import { taskStore } from '../../../taskStore';
import { setupInputDetection } from '../../../utils/detectInput';
import { Logger } from '../../../utils/logger';
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
    const handleContinue = async (event: Event) => {
      // We manage advancement ourselves (finishTrial below), so stop the event
      // from reaching the html-multi-response plugin's own button handler, which
      // would otherwise run against the DOM we've just torn down and throw.
      // preventDefault on touchend also suppresses the synthesized ghost click.
      event.preventDefault();
      event.stopImmediatePropagation();

      if (handled) return;
      handled = true;
      continueButton?.removeEventListener('click', handleContinue);
      continueButton?.removeEventListener('touchend', handleContinue);

      try {
        // Both resume() and requestFullscreen() require transient activation:
        // some browsers (especially Safari) only honor them when they are
        // *called* synchronously during a user gesture. Nothing may be awaited
        // before them within the user gesture handler, since after the first
        // await the handler continues on a later microtask, by which point the
        // gesture's activation has expired and the call is rejected, e.g.,
        // Safari 18.x throws "Cannot request fullscreen without transient
        // activation" if resume() is awaited before requestFullscreen().
        //
        // Ordering matters between these two synchronous calls: we start
        // resume() *first* and only request fullscreen after. Requesting
        // fullscreen first begins a transition that leaves resume()'s promise
        // pending until it completes, which causes the await below to hang and
        // prevent the trial from ever advancing.
        const resumePromise = jsPsych.pluginAPI.audioContext()?.resume();

        // fscreen.fullscreenEnabled only reflects document.fullscreenEnabled;
        // it does not guarantee the element actually has a requestFullscreen
        // method, e.g., Mobile Safari 26.x on iOS 18.x reports fullscreen as
        // enabled but leaves document.documentElement.requestFullscreen
        // undefined, so calling it throws "requestFullscreen is not a
        // function". Guard on the resolved request function instead.
        const fullscreenElement = document.documentElement;
        if (fscreen.fullscreenEnabled && typeof fscreen.requestFullscreenFunction(fullscreenElement) === 'function') {
          const diagnostics = {
            source: 'enterFullscreen',
            fullscreenEnabled: document.fullscreenEnabled,
            hasFullscreenElement: Boolean(document.fullscreenElement),
            userActivationIsActive: navigator.userActivation?.isActive ?? null,
            userActivationHasBeenActive: navigator.userActivation?.hasBeenActive ?? null,
          };
          void Promise.resolve(fscreen.requestFullscreen(fullscreenElement)).catch((error: unknown) => {
            Logger.getInstance().error(error instanceof Error ? error : new Error(String(error)), diagnostics);
          });
        }

        // Await resume() so the audio context is actually running before we
        // advance; otherwise the next trial's audio fails to autoplay.
        await resumePromise;
      } finally {
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
