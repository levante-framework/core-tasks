import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import { StimulusType, StimulusSideType, getCorrectInputSide} from '../helpers/utils';
import { replayButtonSvg, overrideAudioTrialForReplayableAudio } from '../helpers/audioTrials';

/**
 * Builds a practice trial for the Instruction sections.
 * @param {*} stimulusType
 * @param {*} promptText
 * @param {*} promptAudioAsset
 * @param {*} stimulusSideType
 */
export function buildInstructionPracticeTrial(stimulusType, promptText, promptAudioAsset, stimulusSideType) {
  const replayButtonHtmlId = 'replay-btn';
  const validAnswer = getCorrectInputSide(stimulusType, stimulusSideType);
  const trial = {
    type: jsPsychAudioMultiResponse,
    stimulus: promptAudioAsset,
    prompt: () => {
      if (stimulusSideType === StimulusSideType.Left) {
        return `<div id='stimulus-container-hf'>
                            <div id='${replayButtonHtmlId}'>
                              ${replayButtonSvg}
                            </div>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[stimulusType]} alt="heart or flower"/>
                            </div>
                            <div class='stimulus'>
                                <p class='practice-text'>${promptText}</p>
                            </div>
                        </div>`;
      } else {
        return `<div id='stimulus-container-hf'>
                            <div id='${replayButtonHtmlId}'>
                              ${replayButtonSvg}
                            </div>
                            <div class='stimulus'>
                                <p class='practice-text'>${promptText}</p>
                            </div>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[stimulusType]} alt="heart or flower"/>
                            </div>
                        </div>`;
      }
    },
    prompt_above_buttons: true,
    on_start: () => {
      store.session.set('stimulus', stimulusType);
      store.session.set('side', stimulusSideType);
    },
    on_load: () => {
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('btn-layout-hf');

      //TODO: use alt tag to query the proper button directly
      const buttons = document.querySelectorAll('.response-btn');
      if (buttons.length != 2) {
        console.error(`There are ${buttons.length} instead of 2 wrappers in the practice trials`);
      }
      buttons[validAnswer].style.animation = 'pulse 2s infinite';

    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: [`<button class='response-btn'></button>`, `<button class='response-btn'></button>`],
    on_finish: (data) => {
      // console.log('data in practice: ', data)
      if (data.button_response === 0 || data.button_response === 1) {
        if (data.button_response === validAnswer) {
          store.session.set('correct', true);
        } else {
          store.session.set('correct', false);
        }
      } else {
        // Add same logic for keyboard
        store.session.set('correct', data.keyboard_response);
      }
    },
    // TODO handle stimulus presentation timeout and other parameters
  }
  overrideAudioTrialForReplayableAudio(trial, jsPsych.pluginAPI, replayButtonHtmlId);
  return trial;
}

//TODO: It may seem silly to keep and export these two functions below, but in case we want to
// refactor the feedback trials to NOT dynamically change their prompt and side it will help
// minimize the impact on the calling code.

/**stimulusType, promptText, promptAudioAsset, stimulusSideType
 * Builds a feedback trial for cases where the feedback prompt may change only depending on
 * whether the answer was correct or incorrect.
 */
export function buildStimulusInvariantPracticeFeedback(feedbackPromptIncorrectKey, feedbackPromptCorrectKey) {
  return buildPracticeFeedback(feedbackPromptIncorrectKey, feedbackPromptCorrectKey, feedbackPromptIncorrectKey, feedbackPromptCorrectKey);
}

/**
 * Builds a feedback trial for cases where the feedback prompt may change depending on
 * the stimulus type and whether the answer was correct or incorrect.
 */
export function buildMixedPracticeFeedback(heartFeedbackPromptIncorrectKey, heartfeedbackPromptCorrectKey, flowerFeedbackPromptIncorrectKey, flowerfeedbackPromptCorrectKey) {
  return buildPracticeFeedback(heartFeedbackPromptIncorrectKey, heartfeedbackPromptCorrectKey, flowerFeedbackPromptIncorrectKey, flowerfeedbackPromptCorrectKey)
}

//TODO: rely on previous trial data instead of singleton store to pass stimulus type, side and correct answer.
/*
 * Relying on singleton for storing state is likely a bad pattern: it introduces risk of reading an outdated state
 * in the event the previous trial forgets to update it. And it will make debugging and unit testing difficult.
 * I recommend managing state as objects that are passed around and flow along the control flow of your app.
 * Ideally you make these state objects immutable and updating them means creating a new copy. This allows you to enforce
 * mutation of your state in more strict and predictable manner.
 * You may also want state objects to be as lean as possible (don't store binaries, or large objects, or functions in them)
 * ideally they should be serializable to JSON to make debugging and unit testing easier.
 */
/**
 * Builds a feedback trial for instructions practice trials and practice trials.
 */
function buildPracticeFeedback(heartFeedbackPromptIncorrectKey, heartfeedbackPromptCorrectKey, flowerFeedbackPromptIncorrectKey, flowerfeedbackPromptCorrectKey) {
  const validAnswerButtonHtmlIdentifier = 'valid-answer-btn';
  const feedbackTexts = {
    IncorrectHeart:   store.session.get('translations')[heartFeedbackPromptIncorrectKey],
    CorrectHeart:     store.session.get('translations')[heartfeedbackPromptCorrectKey],
    IncorrectFlower:  store.session.get('translations')[flowerFeedbackPromptIncorrectKey],
    CorrectFlower:    store.session.get('translations')[flowerfeedbackPromptCorrectKey],
  }
  const feedbackAudio = {
    IncorrectHeart:   mediaAssets.audio[heartFeedbackPromptIncorrectKey],
    CorrectHeart:     mediaAssets.audio[heartfeedbackPromptCorrectKey],
    IncorrectFlower:  mediaAssets.audio[flowerFeedbackPromptIncorrectKey],
    CorrectFlower:    mediaAssets.audio[flowerfeedbackPromptCorrectKey],
  }
  const replayButtonHtmlId = 'replay-btn';

  const trial = {
    type: jsPsychAudioMultiResponse,
    stimulus: () => {
      const stimulusType = store.session.get('stimulus');
      const incorrect = store.session.get('correct') === false
      const audioPrompt = stimulusType === StimulusType.Heart ?
          incorrect? feedbackAudio.IncorrectHeart : feedbackAudio.CorrectHeart
          : incorrect? feedbackAudio.IncorrectFlower : feedbackAudio.CorrectFlower;
      return audioPrompt;
    },
    prompt: () => {
      const stimulusType = store.session.get('stimulus');
      const incorrect = store.session.get('correct') === false
      const image = incorrect ? mediaAssets.images[stimulusType] : mediaAssets.images.smilingFace;
      const textPrompt = stimulusType === StimulusType.Heart ?
          incorrect? feedbackTexts.IncorrectHeart : feedbackTexts.CorrectHeart
          : incorrect? feedbackTexts.IncorrectFlower : feedbackTexts.CorrectFlower;
      if (store.session.get('side') === StimulusSideType.Left) {
        return `<div id='stimulus-container-hf'>
                      <div id='${replayButtonHtmlId}'>
                        ${replayButtonSvg}
                      </div>
                      <div class='stimulus'>
                          <img src='${image}' alt="heart or flower"/>
                      </div>
                      <div class='stimulus'>
                          <p class='practice-text'>
                            ${textPrompt}
                          </p>
                      </div>
                  </div>`;
      } else {
        return `<div id='stimulus-container-hf'>
                      <div id='${replayButtonHtmlId}'>
                        ${replayButtonSvg}
                      </div>
                      <div class='stimulus'>
                          <p class='practice-text'>
                              ${textPrompt}
                          </p>
                      </div>
                      <div class='stimulus'>
                          <img src='${image}' alt="heart or flower"/>
                      </div>

                  </div>`;
      }
    },
    prompt_above_buttons: true,
    on_load: () => {
      document.getElementById('jspsych-audio-multi-response-btngroup').classList.add('btn-layout-hf');
      const buttons = document.querySelectorAll('.response-btn');
      buttons.forEach(button => {
        if (button.id === validAnswerButtonHtmlIdentifier) {
          button.style.animation = 'pulse 2s infinite';
        } else {
          button.disabled = true;
        }
      });
    },
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: () => {
      if (store.session.get('correct') === false) {
        const validAnswerPosition = getCorrectInputSide(store.session.get('stimulus'), store.session.get('side'));
        return validAnswerPosition === 0 ? // is valid answer on the left?
        [`<button class='response-btn' id='${validAnswerButtonHtmlIdentifier}'></button>`, `<button class='response-btn'></button>`]
        : [`<button class='response-btn'></button>`, `<button class='response-btn' id='${validAnswerButtonHtmlIdentifier}'></button>`];
      } else {
        return `<button class='response-btn' style='display: none;'></button>`;
      }
    },
    // TODO: Double-check proper timeout length
    trial_duration: () => {
      return store.session.get('correct') === false ? null : 1200;
    },
  };
  overrideAudioTrialForReplayableAudio(trial, jsPsych.pluginAPI, replayButtonHtmlId);
  return trial;
};