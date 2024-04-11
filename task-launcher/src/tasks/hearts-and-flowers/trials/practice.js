import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';

const practiceData = [
  {
    text: () => store.session.get('translations').heartInstruct2,
    stimulus: 'heart',
  },
  {
    text: () => store.session.get('translations').heartPracticeFeedback1,
    stimulus: 'heart',
  },
  {
    text: () => store.session.get('translations').flowerInstruct2,
    stimulus: 'flower',
  },
  // This was originally saying 'on the right side'. May need change.
  {
    text: () => store.session.get('translations').flowerPracticeFeedback1,
    stimulus: 'flower',
  },
  {
    text: () => store.session.get('translations').heartPracticeFeedback2,
    stimulus: 'heart',
  },
  {
    text: () => store.session.get('translations').flowerPracticeFeedback2,
    stimulus: 'flower',
  },
];

const practiceTrials = practiceData.map((data, i) => {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
      if (i % 2 === 0) {
        return `<div id='stimulus-container-hf'>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[data.stimulus]} alt="heart or flower"/>
                            </div>
                            <div class='stimulus'>
                                <p class='practice-text'>${data.text}</p>
                            </div>
                        </div>`;
      } else {
        return `<div id='stimulus-container-hf'>
                            <div class='stimulus'>
                                <p class='practice-text'>${data.text}</p>
                            </div>
                            <div class='stimulus'>
                                <img src=${mediaAssets.images[data.stimulus]} alt="heart or flower"/>
                            </div>
                        </div>`;
      }
    },
    on_start: () => {
      store.session.set('stimulus', data.stimulus);
      store.session.set('side', i % 2 === 0 ? 'left' : 'right');
    },
    on_load: () => {
      document.getElementById('jspsych-html-multi-response-btngroup').classList.add('btn-layout-hf');
    },
    button_choices: ['left', 'right'],
    keyboard_choice: ['ArrowLeft', 'ArrowRight'],
    button_html: [`<button class='response-btn'></button>`, `<button class='response-btn'></button>`],
    on_finish: (data) => {
      // console.log('data in practice: ', data)
      if (store.session.get('stimulus') === 'heart') {
        if (data.button_response === 0 || data.button_response === 1) {
          if (
            (data.button_response === 0 && store.session.get('side') === 'left') ||
            (data.button_response === 1 && store.session.get('side') === 'right')
          ) {
            store.session.set('correct', true);
          } else {
            store.session.set('correct', false);
          }
        } else {
          // Add same logic for keyboard
          store.session.set('correct', data.keyboard_response);
        }
      } else {
        if (data.button_response === 0 || data.button_response === 1) {
          if (
            (data.button_response === 0 && store.session.get('side') === 'right') ||
            (data.button_response === 1 && store.session.get('side') === 'left')
          ) {
            store.session.set('correct', true);
          } else {
            store.session.set('correct', false);
          }
        } else {
          // Add same logic for keyboard
          store.session.set('correct', data.keyboard_response);
        }
      }
    },
  };
});

export const [heartPractice1, heartPractice2, flowerPractice1, flowerPractice2, reminderHeart, reminderFlower] =
  practiceTrials;

export const practiceFeedback = {
  type: jsPsychHTMLMultiResponse,
  stimulus: () => {
    if (store.session.get('side') === 'left') {
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
                              ? store.session.get('translations').heartsAndFlowersTryAgain
                              : store.session.get('translations').feedbackGoodJob
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
                                ? store.session.get('translations').heartsAndFlowersTryAgain
                                : store.session.get('translations').feedbackGoodJob
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
  button_choices: ['left', 'right'],
  keyboard_choice: ['ArrowLeft', 'ArrowRight'],
  button_html: [`<div class='response-btn'></div>`, `<div class='response-btn'></div>`],
  trial_duration: 1200,
};

export const heartPracticeBlock1 = {
  timeline: [heartPractice1, practiceFeedback],
  loop_function: (data) => store.session.get('correct') === false,
};

export const heartPracticeBlock2 = {
  timeline: [heartPractice2, practiceFeedback],
  loop_function: (data) => store.session.get('correct') === false,
};

export const flowerPracticeBlock1 = {
  timeline: [flowerPractice1, practiceFeedback],
  loop_function: (data) => store.session.get('correct') === false,
};

export const flowerPracticeBlock2 = {
  timeline: [flowerPractice2, practiceFeedback],
  loop_function: (data) => store.session.get('correct') === false,
};

export const reminderHeartBlock = {
  timeline: [reminderHeart, practiceFeedback],
  loop_function: (data) => store.session.get('correct') === false,
};

export const reminderFlowerBlock = {
  timeline: [reminderFlower, practiceFeedback],
  loop_function: (data) => store.session.get('correct') === false,
};
