import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import { InputKey } from '../helpers/utils';
import { setupReplayAudio, taskStore, replayButtonSvg, PageStateHandler } from '../../shared/helpers'; 

// These are the instruction "trials" they are full screen with no stimulus

export function getHeartInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    'heartInstruct1',
    taskStore().translations.heartInstruct1, // heart-instruct1, "This is the heart game. Here's how you play it."
    taskStore().translations.continueButtonText,
    //bottomText left undefined
  );
}

export function getFlowerInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    'flowerInstruct1',
    taskStore().translations.flowerInstruct1, // flower-instruct1, "This is the flower game. Here's how you play."
    taskStore().translations.continueButtonText,
    //bottomText left undefined
  );
}

export function getTimeToPractice() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    'heartsAndFlowersPracticeTime',
    taskStore().translations.heartsAndFlowersPracticeTime, // hearts-and-flowers-practice-time: "Time to practice!"
    taskStore().translations.continueButtonText,
    //bottomText left undefined
  );
}

export function getKeepUp() {
  return buildInstructionTrial(
    mediaAssets.images.keepup,
    'heartsAndFlowersInstruct1',
    taskStore().translations.heartsAndFlowersInstruct1, // hearts-and-flowers-instruct1:	"This time the game will go faster. It won't tell you if you are right or wrong."
    taskStore().translations.continueButtonText,
    //taskStore().translations.heartsAndFlowersEncourage1,//Try to keep up!
  );
}

export function getKeepGoing() {
  return buildInstructionTrial(
    mediaAssets.images.rocket,
    'heartsAndFlowersInstruct2',
    taskStore().translations.heartsAndFlowersInstruct2, //hearts-and-flowers-instruct2: "Try to answer as fast as you can without making mistakes."
    taskStore().translations.continueButtonText,
    //taskStore().translations.heartsAndFlowersEncourage2,// If you make a mistake, just keep going!
  );
}

export function getTimeToPlay() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    'heartsAndFlowersPlayTime',
    taskStore().translations.heartsAndFlowersPlayTime, // hearts-and-flowers-play-time: "Time to play!"
    taskStore().translations.continueButtonText,
    //bottomText left undefined
  );
}

export function getMixedInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    'heartsAndFlowersInstruct3',
    taskStore().translations.heartsAndFlowersInstruct3, // hearts-and-flowers-instruct3: "Now, we're going to play a game with hearts and flowers."
    taskStore().translations.continueButtonText,
    //bottomText left undefined
  );
}

export function getEndGame() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    'heartsAndFlowersEnd',
    taskStore().translations.heartsAndFlowersEnd, // hearts-and-flowers-end: "Great job! You've completed the game."
    taskStore().translations.continueButtonText,
    //bottomText left undefined
  );
}

function buildInstructionTrial(mascotImage, promptAudioKey, promptText, buttonText, bottomText=undefined) {
  if (!mascotImage) {
    // throw new Error(`Missing mascot image for instruction trial`);
    console.error(`buildInstructionTrial: Missing mascot image`);
  }
  if (!promptAudioKey) {
    // throw new Error(`Missing prompt audio for instruction trial`);
    console.error(`buildInstructionTrial: Missing prompt audio`);
  }
  if (!promptText) {
    // throw new Error(`Missing prompt text for instruction trial`);
    console.error(`buildInstructionTrial: Missing prompt text`);
  }
  const replayButtonHtmlId = 'replay-btn-revisited';
  const trial = {
    type: jsPsychAudioMultiResponse,
    stimulus: mediaAssets.audio[promptAudioKey],
    prompt:
      `<div class="haf-stimulus-holder">
        <div class="lev-row-container header">
          <p>${promptText}</p>
        </div>
        <button id="${replayButtonHtmlId}" class="replay">
          ${replayButtonSvg}
        </button>
        <div class='haf-image-container'>
          <img
            id='instruction-graphic'
            src=${mascotImage}
            alt='Instruction graphic'
          />
        </div>
        ${bottomText ? `<div class="lev-row-container header"><p>${bottomText}</p></div>` : ''}
      </div>`,
    prompt_above_buttons: true,
    keyboard_choices: InputKey.NoKeys,
    button_choices: ['Next'],
    button_html:[
      `<button class='primary'>
        ${buttonText.trim()}
      </button>`,],
    on_load: () => {
      const pageStateHandler = new PageStateHandler(promptAudioKey);
      setupReplayAudio(pageStateHandler);
    }

  };
  return trial;
}
