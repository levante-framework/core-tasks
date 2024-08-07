import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import { isTouchScreen } from '../../taskSetup';
import {
  StimulusType,
  StimulusSideType,
  InputKey,
  getCorrectInputSide,
  getStimulusLayout
} from '../helpers/utils';
import { PageStateHandler, setupReplayAudio, taskStore } from '../../shared/helpers';

/**
 * Builds a practice trial for the Instruction sections.
 * @param {*} stimulusType
 * @param {*} promptText
 * @param {*} promptAudioAsset
 * @param {*} stimulusSideType
 */
export function buildInstructionPracticeTrial(stimulusType, promptText, promptAudioAsset, stimulusSideType, audioAssetKey) {
  if (!promptAudioAsset) {
    // throw new Error(`Missing prompt audio for instruction practice trial`);
    console.error(`buildInstructionPracticeTrial: Missing prompt audio`);
  }
  if (!promptText) {
    // throw new Error(`Missing prompt text for instruction practice trial`);
    console.error(`buildInstructionPracticeTrial: Missing prompt text`);
  }
  const replayButtonHtmlId = 'replay-btn-revisited';
  const validAnswer = getCorrectInputSide(stimulusType, stimulusSideType);
  const trial = {
    type: jsPsychAudioMultiResponse,
    stimulus: promptAudioAsset,
    prompt: () => {
      return getStimulusLayout(
        mediaAssets.images[stimulusType],
        stimulusSideType === StimulusSideType.Left,
        promptText,
        replayButtonHtmlId,
      );
    },
    prompt_above_buttons: true,
    on_start: () => {
      taskStore('stimulus', stimulusType);
      taskStore('stimulusSide', stimulusSideType);
    },
    on_load: () => {
      document.getElementById('jspsych-audio-multi-response-prompt').classList.add('haf-parent-container');
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('haf-parent-container');
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('lev-response-row');
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('linear-4');

      //TODO: use alt tag to query the proper button directly
      const buttons = document.querySelectorAll('.secondary--green');
      if (buttons.length != 2) {
        console.error(`There are ${buttons.length} instead of 2 wrappers in the practice trials`);
      }
      buttons[validAnswer].style.animation = 'pulse 2s infinite';
      const pageStateHandler = new PageStateHandler(audioAssetKey);
      setupReplayAudio(pageStateHandler);

    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choices: isTouchScreen? InputKey.NoKeys : [InputKey.ArrowLeft, InputKey.ArrowRight],
    button_html: [`
    <div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`, 
    `<div class='response-container--small'>
      <button class='secondary--green'></button>
    </div>`],
    on_finish: (data) => {
      // console.log('data in practice: ', data)

      let response;
      if (data.button_response === 0 || data.button_response === 1) {
        response = data.button_response;
      } else if (data.keyboard_response === InputKey.ArrowLeft || data.keyboard_response === InputKey.ArrowRight){
        response = data.keyboard_response === InputKey.ArrowLeft ? 0 : 1;
      } else {
        const errorMessage = `Invalid response: ${data.button_response} or ${data.keyboard_response} in ${data}`;
        console.error(errorMessage);
      }
      
      if (response === validAnswer) {
        taskStore('isCorrect', true);
      } else {
        taskStore('isCorrect', false);
      }
    },
    // TODO handle stimulus presentation timeout and other parameters
  }
  return trial;
}

//TODO: It may seem silly to keep and export these two functions below, but in case we want to
// refactor the feedback trials to NOT dynamically change their prompt and side it will help
// minimize the impact on the calling code.

/**stimulusType, promptText, promptAudioAsset, stimulusSideType
 * Builds a feedback trial for cases where the feedback prompt may change only depending on
 * whether the answer was correct or incorrect.
 */
export function buildStimulusInvariantPracticeFeedback(feedbackPromptIncorrectKey, feedbackPromptCorrectKey, onFinishTimelineCallback=undefined) {
  return buildPracticeFeedback(feedbackPromptIncorrectKey, feedbackPromptCorrectKey, feedbackPromptIncorrectKey, feedbackPromptCorrectKey, onFinishTimelineCallback);
}

/**
 * Builds a feedback trial for cases where the feedback prompt may change depending on
 * the stimulus type and whether the answer was correct or incorrect.
 */
export function buildMixedPracticeFeedback(heartFeedbackPromptIncorrectKey, heartfeedbackPromptCorrectKey, flowerFeedbackPromptIncorrectKey, flowerfeedbackPromptCorrectKey, onFinishTimelineCallback=undefined) {
  return buildPracticeFeedback(heartFeedbackPromptIncorrectKey, heartfeedbackPromptCorrectKey, flowerFeedbackPromptIncorrectKey, flowerfeedbackPromptCorrectKey, onFinishTimelineCallback)
}

/**
 * Builds a feedback trial for instructions practice trials and practice trials.
 */
function buildPracticeFeedback(heartFeedbackPromptIncorrectKey, heartfeedbackPromptCorrectKey, flowerFeedbackPromptIncorrectKey, flowerfeedbackPromptCorrectKey,
  onFinishTimelineCallback) {
  const validAnswerButtonHtmlIdentifier = 'valid-answer-btn';
  const feedbackTexts = {
    IncorrectHeart:   taskStore().translations[heartFeedbackPromptIncorrectKey],
    CorrectHeart:     taskStore().translations[heartfeedbackPromptCorrectKey],
    IncorrectFlower:  taskStore().translations[flowerFeedbackPromptIncorrectKey],
    CorrectFlower:    taskStore().translations[flowerfeedbackPromptCorrectKey],
  }
  const feedbackAudio = {
    IncorrectHeart:   heartFeedbackPromptIncorrectKey,
    CorrectHeart:     heartfeedbackPromptCorrectKey,
    IncorrectFlower:  flowerFeedbackPromptIncorrectKey,
    CorrectFlower:    flowerfeedbackPromptCorrectKey,
  }
  Object.entries(feedbackTexts).forEach(([key, value]) => {
    if (!value) {
      // throw new Error(`Missing feedback text for ${key}`);
      console.error(`buildPracticeFeedback: Missing feedback text for ${key}`);
    }
  });
  Object.entries(feedbackAudio).forEach(([key, value]) => {
    if (!value) {
      // throw new Error(`Missing feedback audio for ${key}`);
      console.error(`buildPracticeFeedback: Missing feedback audio for ${key}`);
    }
  });

  function getAssetKey() {
    const heartsKey = taskStore().stimulus === StimulusType.Heart ? 'Heart' : 'Flower';
    const correctKey = taskStore().isCorrect === false ? 'Incorrect' : 'Correct';
    return feedbackAudio[`${correctKey}${heartsKey}`];
  }

  const trial = {
    type: jsPsychAudioMultiResponse,
    stimulus: () => {
      const audioAssetKey = getAssetKey();
      return mediaAssets.audio[audioAssetKey];
    },
    prompt: () => {
      const stimulusType = taskStore().stimulus;
      const incorrect = taskStore().isCorrect === false
      //TODO: now that the 'correct' feedback layout differs significantly from the 'incorrect' feedback layout, we should consider
      // moving them to separate trials and using conditional trials
      if (!incorrect) {
        const correctPrompt = StimulusType.Heart ? feedbackTexts.CorrectHeart : feedbackTexts.CorrectFlower;
        return `
          <div class='haf-cr-container'>
            <img src='${mediaAssets.images.smilingFace}' />
            <p class='lev-text h4 primary'>${correctPrompt}</p>
          </div>
        `;
      }
      //no else: user input was incorrect
      const imageSrc = mediaAssets.images[stimulusType];
      const promptText = stimulusType === StimulusType.Heart
        ? feedbackTexts.IncorrectHeart
        : feedbackTexts.IncorrectFlower;
      return getStimulusLayout(
        imageSrc,
        taskStore().stimulusSide === StimulusSideType.Left,
        promptText,
        false,
      )
    },
    prompt_above_buttons: true,
    on_load: () => {
      document.getElementById('jspsych-audio-multi-response-prompt').classList.add('haf-parent-container');
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('haf-parent-container');
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('lev-response-row');
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('linear-4');
      const buttons = document.querySelectorAll('.secondary--green');
      buttons.forEach(button => {
        if (button.id === validAnswerButtonHtmlIdentifier) {
          button.style.animation = 'pulse 2s infinite';
        } else {
          button.disabled = true;
        }
      });
      const audioAssetKey = getAssetKey();
      const pageStateHandler = new PageStateHandler(audioAssetKey);
      setupReplayAudio(pageStateHandler);
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choices: () => {
      if (isTouchScreen) return InputKey.NoKeys;
      //else: allow keyboard input
      if (taskStore().isCorrect === false) {
        const validAnswerPosition = getCorrectInputSide(taskStore().stimulus, taskStore().stimulusSide);
        return validAnswerPosition === 0?
          InputKey.ArrowLeft : InputKey.ArrowRight;
      } else {
        return InputKey.AllKeys;
      }
    },
    button_html: () => {
      if (taskStore().isCorrect === false) {
        const validAnswerPosition = getCorrectInputSide(taskStore().stimulus, taskStore().stimulusSide);
        return validAnswerPosition === 0 ? // is valid answer on the left?
        [
          `
          <div class='response-container--small'>
            <button class='secondary--green' id='${validAnswerButtonHtmlIdentifier}'></button>
          </div>
          `,
          `
          <div class='response-container--small'>
            <button class='secondary--green'></button>
          </div>
          `
        ]
        : [
          `
          <div class='response-container--small'>
            <button class='secondary--green'></button>
          </div>
          `,
          `
          <div class='response-container--small'>
            <button class='secondary--green' id='${validAnswerButtonHtmlIdentifier}'></button>
          </div>
          `,
        ];
      } else {
        return `<button class='secondary--green' style='display: none;'></button>`;
      }
    },
    trial_ends_after_audio: () => {
      // always end practice trial after audio regardless of response
      return true;
    },
    on_finish: (data) => {
      if (onFinishTimelineCallback) {
        onFinishTimelineCallback(data);
      }
    },
  };
  return trial;
};
