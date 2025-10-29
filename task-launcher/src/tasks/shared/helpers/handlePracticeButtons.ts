import { mediaAssets } from '../../..';
import { jsPsych } from '../../taskSetup';
import { PageAudioHandler } from './audioHandler';
import { taskStore } from '../../../taskStore';

function enableBtns(btnElements: NodeListOf<HTMLButtonElement>) {
  btnElements.forEach((btn) => (btn.disabled = false));
}

export function addPracticeButtonListeners(
  stim: StimulusType, 
  isTouchScreen: boolean, 
  itemConfig: LayoutConfigType,
  onCorrect?: () => void,
  onIncorrect?: () => void,
) {
  const practiceBtns: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.practice-btn');
  let keyboardFeedbackHandler: (ev: KeyboardEvent) => void;

  practiceBtns.forEach((btn, i) => {
    const eventType = isTouchScreen ? 'touchend' : 'click';

    btn.addEventListener(eventType, (e) => {
      handlePracticeButtonPress(btn, stim, practiceBtns, false, i, itemConfig, onCorrect, onIncorrect);
    });
  });

  if (!isTouchScreen) {
    keyboardFeedbackHandler = (e: KeyboardEvent) => keyboardBtnFeedback(e, practiceBtns, stim, itemConfig);
    document.addEventListener('keydown', keyboardFeedbackHandler);

    return keyboardFeedbackHandler;
  }
}

function handlePracticeButtonPress(
  btn: HTMLButtonElement,
  stim: StimulusType,
  practiceBtns: NodeListOf<HTMLButtonElement>,
  isKeyBoardResponse: boolean,
  responsevalue: string | number,
  itemConfig: LayoutConfigType,
  onCorrect?: () => void,
  onIncorrect?: () => void,
) {
  const index = Array.prototype.indexOf.call(practiceBtns, btn);
  const choices = itemConfig.response?.values || [];
  const choice = choices[index];
  const isCorrectChoice = choice?.toString() === stim.answer?.toString();

  if (isCorrectChoice) {
    btn.classList.add('success-shadow');
    setTimeout(
      () =>
        jsPsych.finishTrial({
          response: choice,
          incorrectPracticeResponses: taskStore().incorrectPracticeResponses,
          button_response: !isKeyBoardResponse ? responsevalue : null,
          keyboard_response: isKeyBoardResponse ? responsevalue : null,
        }),
      onCorrect ? 3000 : 1000, // if callback is provided, give more time for callback to finish before ending trial
    );
    
    // if there is audio playing, stop it first before playing feedback audio to prevent overlap between trials
    PageAudioHandler.stopAndDisconnectNode();
    onCorrect ? onCorrect() : PageAudioHandler.playAudio(mediaAssets.audio.feedbackGoodJob);
  } else {
    btn.classList.add('error-shadow');
    // jspysch disables the buttons for some reason, so re-enable them
    setTimeout(() => enableBtns(practiceBtns), 500);

    let incorrectPracticeResponses = taskStore().incorrectPracticeResponses;
    incorrectPracticeResponses.push(choice);
    taskStore('incorrectPracticeResponses', incorrectPracticeResponses);

    PageAudioHandler.stopAndDisconnectNode();
    onIncorrect ? onIncorrect() : PageAudioHandler.playAudio(mediaAssets.audio.feedbackTryAgain);
  }
}

const getKeyboardChoices = (itemConfig: LayoutConfigType) => {
  const buttonLength = itemConfig.response.values.length;
  if (buttonLength === 1) {
    // instruction trial
    return ['Enter'];
  }
  if (buttonLength === 2) {
    return ['ArrowLeft', 'ArrowRight'];
  }
  if (buttonLength === 3) {
    return ['ArrowUp', 'ArrowLeft', 'ArrowRight'];
  }
  if (buttonLength === 4) {
    return ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
  }
  throw new Error('More than 4 buttons are not supported yet');
};

async function keyboardBtnFeedback(
  e: KeyboardEvent,
  practiceBtns: NodeListOf<HTMLButtonElement>,
  stim: StimulusType,
  itemConfig: LayoutConfigType,
) {
  const allowedKeys = getKeyboardChoices(itemConfig);
  const index = allowedKeys.findIndex((f) => f.toLowerCase() === e.key.toLowerCase());

  if (allowedKeys.includes(e.key)) {
    const btnClicked = practiceBtns[index];

    if (btnClicked) {
      handlePracticeButtonPress(btnClicked, stim, practiceBtns, true, e.key.toLowerCase(), itemConfig);
    }
  }
}
