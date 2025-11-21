import { mediaAssets } from '../../..';
import { jsPsych } from '../../taskSetup';
import { PageAudioHandler } from './audioHandler';
import { taskStore } from '../../../taskStore';

function enableBtns(btnElements: NodeListOf<HTMLButtonElement>) {
  btnElements.forEach((btn) => (btn.disabled = false));
}

export function addPracticeButtonListeners(
  answer: string, 
  isTouchScreen: boolean, 
  choices: string[],
  onCorrect?: () => void,
  onIncorrect?: () => void,
) {
  const practiceBtns: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.practice-btn');
  let keyboardFeedbackHandler: (ev: KeyboardEvent) => void;

  practiceBtns.forEach((btn, i) => {
    const eventType = isTouchScreen ? 'touchend' : 'click';

    btn.addEventListener(eventType, (e) => {
      handlePracticeButtonPress(btn, answer, practiceBtns, false, i, choices, onCorrect, onIncorrect);
    });
  });

  if (!isTouchScreen) {
    keyboardFeedbackHandler = (e: KeyboardEvent) => keyboardBtnFeedback(e, practiceBtns, answer, choices);
    document.addEventListener('keydown', keyboardFeedbackHandler);

    return keyboardFeedbackHandler;
  }
}

function handlePracticeButtonPress(
  btn: HTMLButtonElement,
  answer: string,
  practiceBtns: NodeListOf<HTMLButtonElement>,
  isKeyBoardResponse: boolean,
  responsevalue: string | number,
  choices: string[],
  onCorrect?: () => void,
  onIncorrect?: () => void,
) {
  const index = Array.prototype.indexOf.call(practiceBtns, btn);
  const choice = choices[index];
  const isCorrectChoice = choice?.toString() === answer;

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

const getKeyboardChoices = (choices: string[]) => {
  const buttonLength = choices.length;
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
  answer: string,
  choices: string[],
) {
  const allowedKeys = getKeyboardChoices(choices);
  const index = allowedKeys.findIndex((f) => f.toLowerCase() === e.key.toLowerCase());

  if (allowedKeys.includes(e.key)) {
    const btnClicked = practiceBtns[index];

    if (btnClicked) {
      handlePracticeButtonPress(btnClicked, answer, practiceBtns, true, e.key.toLowerCase(), choices);
    }
  }
}
