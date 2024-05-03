import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import { replayButtonSvg, overrideAudioTrialForReplayableAudio } from '../helpers/audioTrials';

// These are the instruction "trials" they are full screen with no stimulus

export function getHeartInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    mediaAssets.audio.heartInstruct1,
    store.session.get('translations').heartInstruct1, // heart-instruct1, "This is the heart game. Here's how you play it."
    store.session.get('translations').continueButtonText,
    //bottomText left undefined
  );
}

export function getFlowerInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    mediaAssets.audio.flowerInstruct1,
    store.session.get('translations').flowerInstruct1, // flower-instruct1, "This is the flower game. Here's how you play."
    store.session.get('translations').continueButtonText,
    //bottomText left undefined
  );
}

export function getTimeToPractice() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    mediaAssets.audio.heartsAndFlowersPracticeTime,
    store.session.get('translations').heartsAndFlowersPracticeTime, // hearts-and-flowers-practice-time: "Time to practice!"
    store.session.get('translations').continueButtonText,
    //bottomText left undefined
  );
}

export function getKeepUp() {
  return buildInstructionTrial(
    mediaAssets.images.keepup,
    mediaAssets.audio.heartsAndFlowersInstruct1,
    store.session.get('translations').heartsAndFlowersInstruct1, // hearts-and-flowers-instruct1:	"This time the game will go faster. It won't tell you if you are right or wrong. Try to keep up!"
    store.session.get('translations').continueButtonText,
    //TODO: check whether we need to cut instruction text short to avoid duplicate phrase
    store.session.get('translations').heartsAndFlowersEncourage1,//Try to keep up!
  );
}

export function getKeepGoing() {
  return buildInstructionTrial(
    mediaAssets.images.rocket,
    mediaAssets.audio.heartsAndFlowersInstruct2,
    store.session.get('translations').heartsAndFlowersInstruct2, //hearts-and-flowers-instruct2: "Try to answer as fast as you can without making mistakes. If you make a mistake, just keep going!"
    store.session.get('translations').continueButtonText,
    //TODO: check whether we need to cut instruction text short to avoid duplicate phrase
    store.session.get('translations').heartsAndFlowersEncourage2,// If you make a mistake, just keep going!
  );
}

export function getTimeToPlay() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    mediaAssets.audio.heartsAndFlowersPlayTime,
    store.session.get('translations').heartsAndFlowersPlayTime, // hearts-and-flowers-play-time: "Time to play!"
    store.session.get('translations').continueButtonText,
    //bottomText left undefined
  );
}

export function getMixedInstructions() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    mediaAssets.audio.heartsAndFlowersInstruct3,
    store.session.get('translations').heartsAndFlowersInstruct3, // hearts-and-flowers-instruct3: "Now, we're going to play a game with hearts and flowers."
    store.session.get('translations').continueButtonText,
    //bottomText left undefined
  );
}

export function getEndGame() {
  return buildInstructionTrial(
    mediaAssets.images.animalWhole,
    mediaAssets.audio.heartsAndFlowersEnd,
    store.session.get('translations').heartsAndFlowersEnd, // hearts-and-flowers-end: "Great job! You've completed the game."
    store.session.get('translations').continueButtonText,
    //bottomText left undefined
  );
}

function buildInstructionTrial(mascotImage, promptAudio, promptText, buttonText, bottomText=undefined) {
  if (!mascotImage) {
    // throw new Error(`Missing mascot image for instruction trial`);
    console.error(`buildInstructionTrial: Missing mascot image`);
  }
  if (!promptAudio) {
    // throw new Error(`Missing prompt audio for instruction trial`);
    console.error(`buildInstructionTrial: Missing prompt audio`);
  }
  if (!promptText) {
    // throw new Error(`Missing prompt text for instruction trial`);
    console.error(`buildInstructionTrial: Missing prompt text`);
  }
  const replayButtonHtmlId = 'replay-btn';
  const trial = {
    type: jsPsychAudioMultiResponse,
    stimulus: promptAudio,
    prompt:
      `<div id='stimulus-container'>
        <h1>${promptText}</h1>
        <div id='${replayButtonHtmlId}'>
          ${replayButtonSvg}
        </div>
        <div class='centered-container-haf'>
          <img
            id='instruction-graphic'
            src=${mascotImage}
            alt='Instruction graphic'
          />
        </div>
        ${bottomText ? `<h2>${bottomText}</h2>` : ''}
      </div>`,
    prompt_above_buttons: true,
    button_choices: ['Next'],
    button_html:[
      `<button class='next-btn'>
        <p>${buttonText}</p>
      </button>`.trim(),],
  };
  overrideAudioTrialForReplayableAudio(trial, jsPsych.pluginAPI, replayButtonHtmlId);
  return trial;
}