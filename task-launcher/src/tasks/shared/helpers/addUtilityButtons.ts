import fscreen from 'fscreen';
import { taskStore } from '../../../taskStore';
import { Logger } from '../../../utils';
import { InitPageSetup } from '../../../utils/initPageSetup';
import { jsPsych } from '../../taskSetup';
import { activateFullscreen } from './activateFullscreen';
import { beginTaskTimerPauseSegment, resumeTaskTimerAfterPauseSegment } from './appTimer';
import { PageAudioHandler } from './audioHandler';
import { exitButtonSvg, menuButtonSvg, pauseButtonSvg } from './components';

let pageSetup: InitPageSetup | null = null;
let exitConfirmed = false;

// swallows keyboard events while paused
function blockKeyboardWhilePaused(e: KeyboardEvent) {
  e.stopImmediatePropagation();
  e.preventDefault();
}

// One finger tap can produce touchend, a synthesized click, or only one of the
// two. Listen for both and ignore the second event from the same tap.
function bindPress(button: HTMLButtonElement, action: () => void) {
  let handled = false;
  const run = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (handled) return;
    handled = true;
    window.setTimeout(() => {
      handled = false;
    }, 400);
    action();
  };
  button.addEventListener('touchend', run, { passive: false });
  button.addEventListener('click', run);
}

type JsPsychExitState = {
  current_trial_finished?: boolean;
  paused?: boolean;
  finishExperiment: () => void;
  nextTrial: () => void;
};

export function addExperimenterButtons() {
  // don't add if disabled or if they're already there
  if (document.querySelector('.experimenter-button-container') != null || !taskStore().experimenterButtons) {
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'experimenter-button-container';

  buttonContainer.innerHTML = `
        <button class="utility" id="menu" state="closed">
            ${menuButtonSvg}
        </button>
        <button class="utility transparent" id="exit" style="display: none;">
            ${exitButtonSvg}
        </button>
        <button class="utility transparent" id="pause" style="display: none;">
            ${pauseButtonSvg}
        </button>
    `;

  document.body.appendChild(buttonContainer);

  const pauseButton = document.getElementById('pause');
  pauseButton?.addEventListener('click', () => {
    onPause();
  });

  const exitButton = document.getElementById('exit');
  exitButton?.addEventListener('click', () => {
    onExit();
  });

  const menuButton = document.getElementById('menu');
  menuButton?.addEventListener('click', () => {
    onMenuPress(menuButton as HTMLButtonElement);
  });

  pageSetup = new InitPageSetup(4000, taskStore().translations);
  pageSetup.init();

  const popup = document.createElement('div');
  popup.id = 'exit-confirmation-popup';
  popup.classList.add('exit-confirmation-popup');
  popup.textContent = taskStore().translations.generalConfirmExit;
  popup.style.display = 'none';

  const popupButtonContainer = document.createElement('div');
  popupButtonContainer.id = 'exit-confirmation-popup-buttons';
  popupButtonContainer.classList.add('exit-confirmation-popup-buttons');
  const yesLabel = taskStore().translations.generalYes || 'Yes';
  const noLabel = taskStore().translations.generalNo || 'No';
  popupButtonContainer.innerHTML = `
        <button type="button" class="primary small exit-confirmation-choice" id="exit-confirm-yes">${yesLabel}</button>
        <button type="button" class="primary small exit-confirmation-choice" id="exit-confirm-no">${noLabel}</button>
    `;
  popup.appendChild(popupButtonContainer);
  document.body.appendChild(popup);

  const yesButton = document.getElementById('exit-confirm-yes') as HTMLButtonElement;
  const noButton = document.getElementById('exit-confirm-no') as HTMLButtonElement;
  bindPress(yesButton, confirmExit);
  bindPress(noButton, dismissExitPopup);
}

export function setupFullscreenButton() {
  const fullscreenButton = document.getElementById('fullscreen');
  fullscreenButton?.addEventListener('click', () => {
    onFullscreen();
  });

  document.addEventListener('fullscreenchange', () => {
    if (!fullscreenButton) {
      return;
    }

    if (document.fullscreenElement) {
      fullscreenButton.style.visibility = 'hidden';
    } else {
      fullscreenButton.style.visibility = 'visible';
    }
  });
}

function onPause() {
  taskStore('isPaused', true);
  jsPsych.pauseExperiment();
  window.addEventListener('keydown', blockKeyboardWhilePaused, true);
  beginTaskTimerPauseSegment();

  if (taskStore().currentTrialTimeoutId) {
    clearTimeout(taskStore().currentTrialTimeoutId);
    taskStore('currentTrialTimeoutId', undefined);
  }

  pageSetup?.onPause();
  const playButton = document.getElementById('play-button');
  playButton?.addEventListener('click', () => {
    onResume();
  });

  PageAudioHandler.stopAndDisconnectNode(true);

  if (taskStore().staggerTimeout) {
    clearTimeout(taskStore().staggerTimeout);
    taskStore('staggerTimeout', undefined);
  }

  if (taskStore().replayEnableTimeout) {
    clearTimeout(taskStore().replayEnableTimeout);
    taskStore('replayEnableTimeout', undefined);
  }

  if (taskStore().animationTimeouts) {
    taskStore().animationTimeouts.forEach((timeout: NodeJS.Timeout) => {
      clearTimeout(timeout);
    });
  }
}

function onResume() {
  taskStore('isPaused', false);
  jsPsych.resumeExperiment();
  window.removeEventListener('keydown', blockKeyboardWhilePaused, true);

  if (taskStore().currentTrialTimeLimitMs) {
    const currentTrialTimeout = jsPsych.pluginAPI.setTimeout(() => {
      if (taskStore().isPaused || taskStore().currentTrialTimeoutId !== currentTrialTimeout) return;
      jsPsych.finishTrial();
    }, taskStore().currentTrialTimeLimitMs);

    taskStore('currentTrialTimeoutId', currentTrialTimeout);
  }

  resumeTaskTimerAfterPauseSegment();
  // re-enable all buttons
  const buttons = Array.from(document.querySelectorAll('button'));
  buttons.forEach((button: HTMLButtonElement) => {
    button.disabled = false;
  });

  // trigger replay button, which will repeat audio and animations
  PageAudioHandler.stopAndDisconnectNode(true);
  const replayButton = document.getElementById('replay-btn-revisited') as HTMLButtonElement;
  if (replayButton && !replayButton.disabled) {
    replayButton.click();
    replayButton.disabled = true;
  }
}

function onExit() {
  openPopup();
}

function dismissExitPopup() {
  closePopup();
  collapseExperimenterMenu();
}

function collapseExperimenterMenu() {
  const menuButton = document.getElementById('menu');
  const exitButton = document.getElementById('exit');
  const pauseButton = document.getElementById('pause');

  if (exitButton) exitButton.style.display = 'none';
  if (pauseButton) pauseButton.style.display = 'none';
  if (menuButton) {
    menuButton.classList.remove('open');
    menuButton.setAttribute('state', 'closed');
  }
}

function confirmExit() {
  if (exitConfirmed) return;
  exitConfirmed = true;

  try {
    if (taskStore().effectiveStoppingRule !== 'sufficientTrials') {
      taskStore('effectiveStoppingRule', 'experimenterExit');
    }
    taskStore('taskAborted', true);

    // clear any in-flight trial timer state so a stale time limit can't leak into a later task
    if (taskStore().currentTrialTimeoutId) {
      clearTimeout(taskStore().currentTrialTimeoutId);
    }
    taskStore('currentTrialTimeoutId', undefined);
    taskStore('currentTrialTimeLimitMs', null);

    const logger = Logger.getInstance();
    logger.capture('Task finished: experimenter ended task', {
      taskName: taskStore().task,
      taskFinished: true,
    });

    dismissExitPopup();
    endExperimentFromExperimenter();
  } catch (error) {
    exitConfirmed = false;
    throw error;
  }
}

// endExperiment() is a no-op once the current trial has already finished, and
// nextTrial() does nothing while the run is paused. Either state leaves the
// dialog up after Yes. Clear pause first, then finish a trial that is already
// over without waiting out its gap.
function endExperimentFromExperimenter() {
  const psych = jsPsych as unknown as JsPsychExitState;
  const trialAlreadyFinished = Boolean(psych.current_trial_finished);

  if (psych.paused || taskStore().isPaused) {
    window.removeEventListener('keydown', blockKeyboardWhilePaused, true);
    taskStore('isPaused', false);
    pageSetup?.onResume();
    psych.paused = false;
  }

  jsPsych.endExperiment();

  if (!trialAlreadyFinished) return;

  const finish = psych.finishExperiment.bind(psych);
  let finished = false;
  psych.finishExperiment = () => {
    if (finished) return;
    finished = true;
    finish();
  };
  psych.nextTrial();
}

function onFullscreen() {
  if (fscreen.fullscreenElement) {
    return;
  }

  activateFullscreen('utilityButton');
}

function onMenuPress(menuButton: HTMLButtonElement) {
  const exitButton = document.getElementById('exit');
  const pauseButton = document.getElementById('pause');

  if (menuButton.getAttribute('state') === 'closed') {
    if (exitButton) exitButton.style.display = 'block';
    if (pauseButton) pauseButton.style.display = 'block';
    menuButton.classList.add('open');
    menuButton.setAttribute('state', 'open');
  } else {
    if (exitButton) exitButton.style.display = 'none';
    if (pauseButton) pauseButton.style.display = 'none';
    menuButton.classList.remove('open');
    menuButton.setAttribute('state', 'closed');
  }
}

function openPopup() {
  const popup = document.getElementById('exit-confirmation-popup');
  if (popup) {
    popup.style.display = 'block';
  }
}

function closePopup() {
  const popup = document.getElementById('exit-confirmation-popup');
  if (popup) {
    popup.style.display = 'none';
  }
}
