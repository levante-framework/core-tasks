import { mediaAssets } from "../../..";
import { jsPsych } from "../../taskSetup";
import { PageAudioHandler } from "./audioHandler";
import { taskStore } from "../../../taskStore";

function enableBtns(btnElements: NodeListOf<HTMLButtonElement>) {
    btnElements.forEach((btn) => (btn.disabled = false));
}

export function addPracticeButtonListeners(stim: StimulusType, isTouchScreen: boolean, itemConfig: LayoutConfigType) {
  const practiceBtns: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.practice-btn');
  let keyboardFeedbackHandler: (ev: KeyboardEvent) => void;
    
  practiceBtns.forEach((btn, i) =>
    btn.addEventListener('click', async (e) => {
      handlePracticeButtonPress(btn, stim, practiceBtns, false, i, itemConfig);
    }),
  );
    
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
) {
  const index = Array.prototype.indexOf.call(practiceBtns, btn);
  const choices = itemConfig.response?.values || [];
  const choice = choices[index];
  const isCorrectChoice = choice?.toString() === stim.answer?.toString();
  let feedbackAudio;

  if (isCorrectChoice) {
    btn.classList.add('success-shadow');
    feedbackAudio = mediaAssets.audio.feedbackGoodJob;
    setTimeout(
      () => jsPsych.finishTrial({
        response: choice,
        incorrectPracticeResponses: taskStore().incorrectPracticeResponses, 
        button_response: !isKeyBoardResponse ? responsevalue : null,
        keyboard_response: isKeyBoardResponse ? responsevalue : null,
      }),
      1000,
    );
  } else {
    btn.classList.add('error-shadow');
    feedbackAudio = mediaAssets.audio.feedbackTryAgain;
    // jspysch disables the buttons for some reason, so re-enable them
    setTimeout(() => enableBtns(practiceBtns), 500);

    let incorrectPracticeResponses = taskStore().incorrectPracticeResponses; 
    incorrectPracticeResponses.push(choice);
    taskStore("incorrectPracticeResponses", incorrectPracticeResponses);
  }
  // if there is audio playing, stop it first before playing feedback audio to prevent overlap between trials
  PageAudioHandler.stopAndDisconnectNode();
  PageAudioHandler.playAudio(feedbackAudio);
}

const getKeyboardChoices = (itemConfig: LayoutConfigType) => {
  const buttonLength = itemConfig.response.values.length;
  if (buttonLength === 1) { // instruction trial
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
  e: KeyboardEvent, practiceBtns: 
  NodeListOf<HTMLButtonElement>, 
  stim: StimulusType, 
  itemConfig: LayoutConfigType,
) {
    const allowedKeys = getKeyboardChoices(itemConfig);
    const index = allowedKeys.findIndex(f => f.toLowerCase() === e.key.toLowerCase())
  
    if (allowedKeys.includes(e.key)) {
      const btnClicked = practiceBtns[index];

      if (btnClicked) {
        handlePracticeButtonPress(btnClicked, stim, practiceBtns, true, e.key.toLowerCase(), itemConfig);
      }
    }
}
