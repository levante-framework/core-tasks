import { mediaAssets } from "../../..";
import { jsPsych } from "../../taskSetup";
import { PageAudioHandler } from "./audioHandler";

function enableBtns(btnElements: NodeListOf<HTMLButtonElement>) {
    btnElements.forEach((btn) => (btn.disabled = false));
}

export function handlePracticeButtonPress(
  btn: HTMLButtonElement,
  stim: StimulusType,
  practiceBtns: NodeListOf<HTMLButtonElement>,
  isKeyBoardResponse: boolean,
  responsevalue: string | number,
  incorrectPracticeResponses: Array<string | null> = []
) {
  const choice = btn?.children?.length ? (btn.children[0] as HTMLImageElement).alt : btn.textContent;
  const isCorrectChoice = choice?.toString() === stim.answer?.toString();
  let feedbackAudio;

  if (isCorrectChoice) {
    btn.classList.add('success-shadow');
    feedbackAudio = mediaAssets.audio.feedbackGoodJob;
    setTimeout(
      () => jsPsych.finishTrial({
        response: choice,
        incorrectPracticeResponses, 
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
    incorrectPracticeResponses.push(choice);
  }
  // if there is audio playing, stop it first before playing feedback audio to prevent overlap between trials
  PageAudioHandler.stopAndDisconnectNode();
  PageAudioHandler.playAudio(feedbackAudio);

  return incorrectPracticeResponses; 
}

export const getKeyboardChoices = (buttonLength: number) => {
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

export async function keyboardBtnFeedback(e: KeyboardEvent, practiceBtns: NodeListOf<HTMLButtonElement>, stim: StimulusType) {
    const allowedKeys = getKeyboardChoices(practiceBtns.length);
    const index = allowedKeys.findIndex(f => f.toLowerCase() === e.key.toLowerCase())
  
    if (allowedKeys.includes(e.key)) {
      const btn = practiceBtns[index]; 
      const choice = btn.children?.length ? (btn.children[0] as HTMLImageElement).alt : btn.textContent;
      
      const btnClicked = Array.from(practiceBtns).find(btn => {
        const btnOption = btn?.children?.length ? (btn.children[0] as HTMLImageElement).alt : btn.textContent;
        return (btnOption || '').toString() === (choice || '')?.toString();
      });

      if (btnClicked) {
        handlePracticeButtonPress(btnClicked, stim, practiceBtns, true, e.key.toLowerCase());
      }
    }
  }
