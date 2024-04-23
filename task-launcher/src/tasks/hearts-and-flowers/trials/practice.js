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
 * build a feedback trial for instruction practice trials and practice trials
 * @param {*} feedbackTextIncorrect 
 * @param {*} feedbackTextCorrect
 */
export function buildPracticeFeedback(feedbackTextIncorrect, feedbackTextCorrect) {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => { //TODO: animate the correct answer for an "incorrect answer" feedback
      if (store.session.get('side') === StimulusSideType.Left) {
        return `<div id='stimulus-container-hf'>
                      <div class='stimulus'>
                          <img src='${
                            store.session.get('correct') === false
                              ? mediaAssets.images[store.session.get('stimulus')]
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