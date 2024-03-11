import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import _shuffle from 'lodash/shuffle';
import _toNumber from 'lodash/toNumber';
import { jsPsych } from '../../taskSetup';
import store from 'store2';
import { isPractice, } from '../../shared/helpers';

let chosenAnswer,
  sliderStart,
  keyboardResponseMap = {};

function captureValue(btnElement, event) {
  let containerEl = document.getElementById('slider-btn-container') || null;

  if (!containerEl) {
    const layout = store.session('config').buttonLayout;
    containerEl = document.getElementsByClassName(`${layout}-layout`)[0];
  }

  Array.from(containerEl.children).forEach((el) => {
    el.children[0].id = '';
  });

  if (event?.key) {
    chosenAnswer = _toNumber(keyboardResponseMap[event.key.toLowerCase()]);
  } else {
    chosenAnswer = _toNumber(btnElement.textContent);
  }

  jsPsych.finishTrial();
}

// Defining the function here since we need a reference to it to remove the event listener later
function captureBtnValue(event) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    captureValue(null, event);
  } else return;
}

function getRandomValue(max, avoid) {
  let result;

  do {
    result = Math.floor(Math.random() * (max + 1));
  } while (result === avoid);

  return result;
}

export const slider = {
  type: HTMLSliderResponse,
  data: () => {
    return {
      save_trial: true,
      assessment_stage: store.session.get('nextStimulus').task,
      isPracticeTrial: store.session.get('nextStimulus').notes === 'practice',
    };
  },
  stimulus: () => {
    const stim = store.session.get('nextStimulus');
    const prompt = stim.prompt;
    if (prompt.includes('Move the slider')) {
      return `
        <div id='stimulus-container'>
          <div id="prompt-container-text">
            <p id="prompt">Move the slider to the number: ${stim.answer}</p>
          </div>
        </div>`;
    } else {
      return `<div id='stimulus-container'>
                <div id="prompt-container-text">
                    <p id=prompt>${prompt}</p>
                </div>
              </div>`;
    }
  },
  labels: () => store.session.get('nextStimulus').item,
  // button_label: 'Continue',
  require_movement: () => store.session.get('nextStimulus').trialType === 'Number Line Slider',
  slider_width: 800,
  min: () => store.session.get('nextStimulus').item[0],
  max: () => (store.session.get('nextStimulus').item[1] === 1 ? 100 : store.session.get('nextStimulus').item[1]),
  slider_start: () => {
    const stim = store.session.get('nextStimulus');

    if (stim.trialType.includes('Slider')) {
      const max = stim.item[1] === 1 ? 100 : stim.item[1];
      sliderStart = getRandomValue(max, stim.answer);
    } else {
      sliderStart = stim.answer < 1 ? stim.answer * 100 : stim.answer;
    }

    return sliderStart;
  },
  step: 1,
  // response_ends_trial: true,
  on_load: () => {
    const slider = document.getElementById('jspsych-html-slider-response-response');
    slider.classList.add('custom-slider');

    const sliderLabels = document.getElementsByTagName('span');
    Array.from(sliderLabels).forEach((el, i) => {
      //if (i == 1 || i == 2) {
        el.style.fontSize = '1.5rem';
      //}
    });
    const { buttonLayout, keyHelpers } = store.session.get('config');
    const distractors = store.session('nextStimulus');

    const wrapper = document.getElementById('jspsych-html-slider-response-wrapper');
    const buttonContainer = document.createElement('div');

    if (buttonLayout === 'default') {
      buttonContainer.id = 'slider-btn-container';
    }

    // don't apply layout if there aren't exactly 3 button options
    if (!(buttonLayout === 'triple' && distractors.length !== 2)) {
      buttonContainer.classList.add(`${buttonLayout}-layout`);
    }

    if (store.session.get('nextStimulus').trialType === 'Number Line 4afc') {
      // don't let participant move slider
      slider.disabled = true;

      wrapper.style.margin = '0 0 2rem 0';

      // disable continue button and make invisible
      const continueBtn = document.getElementById('jspsych-html-slider-response-next');
      continueBtn.disabled = true;
      continueBtn.style.visibility = 'hidden';

      const { answer, distractors } = store.session.get('nextStimulus');

      distractors.push(answer);

      store.session.set('target', answer);
      store.session.set('choices', distractors);

      const arrowKeyEmojis = [
        ['arrowup', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M41.7238 27.1414L43.8051 25.0602C44.6863 24.1789 44.6863 22.7539 43.8051 21.882L25.5895 3.65703C24.7082 2.77578 23.2832 2.77578 22.4113 3.65703L4.18633 21.882C3.30508 22.7633 3.30508 24.1883 4.18633 25.0602L6.26758 27.1414C7.1582 28.032 8.61133 28.0133 9.4832 27.1039L20.2457 15.807L20.2457 42.7508C20.2457 43.9977 21.2488 45.0008 22.4957 45.0008H25.4957C26.7426 45.0008 27.7457 43.9977 27.7457 42.7508L27.7457 15.807L38.5082 27.1039C39.3801 28.0227 40.8332 28.0414 41.7238 27.1414Z" fill="#A0BBFF"/>
        </svg>
        `], 
        ['arrowleft', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M27.1414 41.7277L25.0602 43.809C24.1789 44.6902 22.7539 44.6902 21.882 43.809L3.65703 25.5934C2.77578 24.7121 2.77578 23.2871 3.65703 22.4152L21.882 4.19023C22.7633 3.30898 24.1883 3.30898 25.0602 4.19023L27.1414 6.27148C28.032 7.16211 28.0133 8.61523 27.1039 9.48711L15.807 20.2496H42.7508C43.9977 20.2496 45.0008 21.2527 45.0008 22.4996V25.4996C45.0008 26.7465 43.9977 27.7496 42.7508 27.7496H15.807L27.1039 38.5121C28.0227 39.384 28.0414 40.8371 27.1414 41.7277Z" fill="#A0BBFF"/>
        </svg>`], 
        ['arrowright', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M20.8586 6.27227L22.9398 4.19102C23.8211 3.30977 25.2461 3.30977 26.118 4.19102L44.343 22.4066C45.2242 23.2879 45.2242 24.7129 44.343 25.5848L26.118 43.8098C25.2367 44.691 23.8117 44.691 22.9398 43.8098L20.8586 41.7285C19.968 40.8379 19.9867 39.3848 20.8961 38.5129L32.193 27.7504H5.24921C4.00234 27.7504 2.99921 26.7473 2.99921 25.5004V22.5004C2.99921 21.2535 4.00234 20.2504 5.24921 20.2504H32.193L20.8961 9.48789C19.9773 8.61602 19.9586 7.16289 20.8586 6.27227Z" fill="#A0BBFF"/>
        </svg>`], 
        ['arrowdown', `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M41.7238 20.8586L43.8051 22.9398C44.6863 23.8211 44.6863 25.2461 43.8051 26.118L25.5895 44.343C24.7082 45.2242 23.2832 45.2242 22.4113 44.343L4.18633 26.118C3.30508 25.2367 3.30508 23.8117 4.18633 22.9398L6.26758 20.8586C7.1582 19.968 8.61133 19.9867 9.4832 20.8961L20.2457 32.193L20.2457 5.24921C20.2457 4.00234 21.2488 2.99921 22.4957 2.99921H25.4957C26.7426 2.99921 27.7457 4.00234 27.7457 5.24921L27.7457 32.193L38.5082 20.8961C39.3801 19.9773 40.8332 19.9586 41.7238 20.8586Z" fill="#A0BBFF"/>
        </svg>`]
      ]

      const responseChoices = store.session('choices');

      // create buttons
      for (let i = 0; i < responseChoices.length; i++) {
        const btnWrapper = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = responseChoices[i];
        btn.classList.add('math-btn');
        btn.addEventListener('click', () => captureValue(btn));
        // To not duplicate event listeners
        if (i === 0) {
          document.addEventListener('keydown', captureBtnValue);
        }

        if (!(buttonLayout === 'triple' && distractors.length !== 2)) {
          if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
            btnWrapper.classList.add(`button${i + 1}`);
          }

          keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i];

          btnWrapper.appendChild(btn);

          if (keyHelpers) {
            // Margin on the actual button element
            btn.style.marginBottom = '.5rem';

            const arrowKeyBorder = document.createElement('div');
            arrowKeyBorder.classList.add('arrow-key-border');

            const arrowKey = document.createElement('p');
            arrowKey.innerHTML = arrowKeyEmojis[i][1];
            arrowKey.style.textAlign = 'center';
            arrowKey.style.margin = '0';
            arrowKeyBorder.appendChild(arrowKey);

            btnWrapper.appendChild(arrowKeyBorder);
          }
        }

        buttonContainer.appendChild(btnWrapper);
      }
    } else {
      const slider = document.getElementById('jspsych-html-slider-response-response');

      slider.addEventListener('input', () => (chosenAnswer = slider.value));
    }

    wrapper.appendChild(buttonContainer);
  },
  on_finish: (data) => {
    // Need to remove event listener after trial completion or they will stack and cause an error.
    document.removeEventListener('keydown', captureBtnValue);

    const stimulus = store.session.get('nextStimulus');

    if (stimulus.trialType === 'Number Line 4afc') {
      data.correct = chosenAnswer === store.session.get('target');
    } else {
      // slider version is an approximation so we can't mark it as true/false
      data.correct = null;
    }

    const response = stimulus.task.includes('Slider') && stimulus.item[1] === 1 ? chosenAnswer / 100 : chosenAnswer;
    const responseType = stimulus.task.includes('4afc') ? 'afc' : 'slider';
    const answer = stimulus.answer;

    jsPsych.data.addDataToLastTrial({
      item: stimulus.item,
      answer: answer,
      response: _toNumber(response),
      responseType: responseType,
      distractors: stimulus.distractors,
      slider_start: stimulus.item[1] === 1 ? sliderStart / 100 : sliderStart,
    });

    console.log('data: ', data);
  },
};
