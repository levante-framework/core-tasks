import jsPsychFullScreen from '@jspsych/plugin-fullscreen';
import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { taskStore } from '../../../taskStore';
import { setupInputDetection } from '../../../utils/detectInput';
import { Logger } from '../../../utils/logger';
import { jsPsych } from '../../taskSetup';
import { activateFullscreen } from '../helpers/activateFullscreen';

const AUDIO_RESUME_WAIT_MS = 3000;
const AUDIO_START_FAILED_FALLBACK = 'The sound did not start. Turn the volume up and tap Continue again.';

function audioStartFailedMessage() {
  const translations = taskStore().translations as { audioStartFailed?: string };
  return translations.audioStartFailed || AUDIO_START_FAILED_FALLBACK;
}

function showAudioStartFailed() {
  const note = document.getElementById('lev-audio-start-failed');
  if (!note) return;
  note.hidden = false;
  note.textContent = audioStartFailedMessage();
}

function reportAudioStartFailure(error: unknown) {
  try {
    Logger.getInstance().error(error instanceof Error ? error : new Error('Audio context did not start'), {
      source: 'enterFullscreen',
    });
  } catch {
    // A task sets the logger before this screen. Ignore a missing logger.
  }
}

function resumeAudio(audioCtx: AudioContext) {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), AUDIO_RESUME_WAIT_MS);
    const settle = (started: boolean) => {
      clearTimeout(timer);
      resolve(started);
    };

    // resume() normally returns a promise that rejects on a closed context.
    // A synchronous throw never reaches the rejection handler below, and would
    // reject this wrapper before the Continue button can be offered again.
    let pending: Promise<unknown>;
    try {
      pending = Promise.resolve(audioCtx.resume());
    } catch {
      settle(false);
      return;
    }

    pending.then(
      () => {
        try {
          settle(audioCtx.state === 'running');
        } catch {
          settle(false);
        }
      },
      () => settle(false),
    );
  });
}

export const enterFullscreen = {
  type: jsPsychHtmlMultiResponse,
  stimulus: () => {
    const t = taskStore().translations;
    return `<div class="lev-row-container header">
        <p>${t.generalFullscreen}</p>
        <p id="lev-audio-start-failed" hidden></p>
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
    const allowAnotherTap = () => {
      handled = false;
      continueButton?.addEventListener('click', handleContinue);
      continueButton?.addEventListener('touchend', handleContinue);
    };
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
      //
      // If the context is already running (later tasks in a battery), skip
      // resume() so it does not consume the tap that fullscreen needs
      // (DASHBOARD-5). First-task / suspended audio keeps the #512 order.
      try {
        const audioCtx = jsPsych.pluginAPI.audioContext() as AudioContext | null;
        const resumePromise = audioCtx && audioCtx.state !== 'running' ? resumeAudio(audioCtx) : undefined;

        activateFullscreen('enterFullscreen');

        const audioStarted = resumePromise ? await resumePromise : true;
        if (!audioStarted) {
          allowAnotherTap();
          showAudioStartFailed();
          reportAudioStartFailure(new Error('Audio context did not start'));
          return;
        }

        jsPsych.finishTrial({ success: true, rt: Math.round(performance.now() - startTime) });
      } catch (error) {
        // requestFullscreen can still throw synchronously. The button listeners
        // are already gone, so finish the trial instead of leaving Continue dead.
        reportAudioStartFailure(error);
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
