import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { StimulusType, StimulusSideType, getCorrectInputSide} from './utils';

/**
 * 
 * @param {*} properties static set of properties containing {stimulusType: StimulusType, text: String}
 * @param {*} stimulusSide a StimulusSideType: the side the stimulus should be on
 */
export function buildInstructionPracticeTrial(properties, stimulusSideType) {
  const validAnswer = getCorrectInputSide(properties.stimulusType, stimulusSideType);
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
      if (stimulusSideType === StimulusSideType.Left) {
        return `<div id='stimulus-container-hf'>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[properties.stimulusType]} alt="heart or flower"/>
                            </div>
                            <div class='stimulus'>
                                <p class='practice-text'>${properties.text()}</p>
                            </div>
                        </div>`;
      } else {
        return `<div id='stimulus-container-hf'>
                            <div class='stimulus'>
                                <p class='practice-text'>${properties.text()}</p>
                            </div>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[properties.stimulusType]} alt="heart or flower"/>
                            </div>
                        </div>`;
      }
    },
    on_start: () => {
      store.session.set('stimulus', properties.stimulusType);
      store.session.set('side', stimulusSideType);
    },
    on_load: () => {
      document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf');
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
}

/**
 * Builds a feedback trial for cases where the feedback text may change only depending on
 * whether the answer was correct or incorrect.
 * @param {*} feedbackTextIncorrect 
 * @param {*} feedbackTextCorrect
 */
export function buildStimulusInvariantPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect) {
  return buildPracticeFeedback(undefined, feedbackTextIncorrect, feedbackTextCorrect);
}

/**
 * Builds a feedback trial for cases where the feedback text may change depending on
 * the stimulus type and whether the answer was correct or incorrect.
 * 
 * @param {*} feedbackTexts an object containing the feedback texts for correct and incorrect
 * answers for both stimulus types, e.g.:
 * feedbackTexts = {
    feedbackTextCorrectHeart: feedbackTextCorrect,
    feedbackTextIncorrectHeart: feedbackTextIncorrectHeart,
    feedbackTextCorrectFlower: feedbackTextCorrect,
    feedbackTextIncorrectFlower: feedbackTextIncorrectFlower,
  }
 */
export function buildMixedPracticeFeedback(feedbackTexts) {
  return buildPracticeFeedback(feedbackTexts, undefined, undefined)
}

/**
 * Builds a feedback trial for instructions practice trials and practice trials.
 */ 
function buildPracticeFeedback(feedbackTexts, feedbackTextIncorrect, feedbackTextCorrect) {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => { //TODO: animate the correct answer for an "incorrect answer" feedback
      const stimulusType = store.session.get('stimulus');
      if (feedbackTexts !== undefined) {
        feedbackTextIncorrect = stimulusType === StimulusType.Heart ?
          feedbackTexts.feedbackTextIncorrectHeart : feedbackTexts.feedbackTextIncorrectFlower;
        feedbackTextCorrect = stimulusType === StimulusType.Heart ?
          feedbackTexts.feedbackTextCorrectHeart : feedbackTexts.feedbackTextCorrectFlower;
      }
      if (store.session.get('side') === StimulusSideType.Left) {
        return `<div id='stimulus-container-hf'>
                      <div class='stimulus'>
                          <img src='${
                            store.session.get('correct') === false
                              ? mediaAssets.images[stimulusType]
                              : mediaAssets.images.smilingFace
                          }' alt="heart or flower"/>
                      </div>
                      <div class='stimulus'>
                          <p class='practice-text'>
                            ${
                              store.session.get('correct') === false
                                ? feedbackTextIncorrect
                                : feedbackTextCorrect
                            }
                          </p>
                      </div>
                  </div>`;
      } else {
        return `<div id='stimulus-container-hf'>
                      <div class='stimulus'>
                          <p class='practice-text'>
                              ${
                                store.session.get('correct') === false
                                  ? feedbackTextIncorrect
                                  : feedbackTextCorrect
                              }
                          </p>
                      </div>
                      <div class='stimulus'>
                          <img src='${
                            store.session.get('correct') === false
                              ? mediaAssets.images[store.session.get('stimulus')]
                              : mediaAssets.images.smilingFace
                          }' alt="heart or flower"/>
                      </div>

                  </div>`;
      }
    },
    on_load: () => document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf'),
    button_choices: [StimulusSideType.Left, StimulusSideType.Right],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
    // TODO: Double-check proper timeout length
    trial_duration: () => {
      return store.session.get('correct') === false ? null : 1200;
    },
  };
};