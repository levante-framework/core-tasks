import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import _shuffle from 'lodash/shuffle';
import _toNumber from 'lodash/toNumber';
import { jsPsych, isTouchScreen } from '../../taskSetup';
import { camelize } from '@bdelab/roar-utils';
import { arrowKeyEmojis, setSkipCurrentBlock, taskStore, replayButtonSvg, setupReplayAudio, PageAudioHandler, PageStateHandler } from '../../shared/helpers';
import { mediaAssets } from '../../..';

let chosenAnswer,
  sliderStart,
  keyboardResponseMap = {};

  function setUpAudio(contentWrapper, prompt, responseType) {
    // add replay button
    const replayButton = document.createElement('button'); 
    replayButton.innerHTML = replayButtonSvg;
    replayButton.id = 'replay-btn-revisited';
    replayButton.classList.add('replay'); 
    replayButton.disabled = true;
    contentWrapper.insertBefore(replayButton, prompt);
  
    const cue = responseType === 'button' ? 'numberLinePrompt1' : 'numberLineSliderPrompt1';
  
    const audioFile = mediaAssets.audio[cue] || '';
    
    PageAudioHandler.playAudio(audioFile, () => {
      // set up replay button audio after the first audio has played
      if (cue) {
        const pageStateHandler = new PageStateHandler(cue);
        setupReplayAudio(pageStateHandler);
      }
    });  
  }

function captureValue(btnElement, event) {
  let containerEl = document.getElementById('slider-btn-container') || null;

  if (!containerEl) {
    const layout = taskStore().buttonLayout;
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

// function getRandomValue(max, avoid) {
//   let result;

//   do {
//     result = Math.floor(Math.random() * (max + 1));
//   } while (result === avoid);

//   return result;
// }

function getRandomValue(max, avoid, tolerance = 0.1) {
  const scaled_avoid = avoid / max;
  let result;

  do {
    result = Math.random();
  } while (Math.abs(result - scaled_avoid) < tolerance);

  return result * max;
}

export const slider = {
  type: HTMLSliderResponse,
  data: () => {
    return {
      save_trial: true,
      assessment_stage: taskStore().nextStimulus.assessmentStage,
      isPracticeTrial: taskStore().nextStimulus.assessmentStage === 'practice_response',
    };
  },
  stimulus: () => {
    const stim = taskStore().nextStimulus;
    let t = taskStore().translations;

    const prompt = stim.prompt;
    if (prompt.includes('Move the slider')) {
      return `
        <div id='stimulus-container'>
          <div id="prompt-container-text">
            <p id="prompt">${t[camelize(stim.audioFile)]} <br /> ${stim.answer}</p>
          </div>
        </div>`;
    } else {
      return `<div id='stimulus-container'>
                <div id="prompt-container-text">
                    <p id=prompt>${t[camelize(stim.audioFile)]}</p>
                </div>
              </div>`;
    }
  },
  labels: () => taskStore().nextStimulus.item,
  // button_label: 'OK',
  require_movement: () => taskStore().nextStimulus.trialType === 'Number Line Slider',
  // slider_width: 800,
  min: () => taskStore().nextStimulus.item[0],
  max: () => taskStore().nextStimulus.item[1],
  // max: () => (taskStore().nextStimulus.item[1] === 1 ? 100 : taskStore().nextStimulus.item[1]),
  slider_start: () => {
    const stim = taskStore().nextStimulus;

    if (stim.trialType.includes('Slider')) {
      // const max = stim.item[1] === 1 ? 100 : stim.item[1];
      const max = stim.item[1];
      sliderStart = getRandomValue(max, stim.answer);
    } else {
      // sliderStart = stim.answer < 1 ? stim.answer * 100 : stim.answer;
      sliderStart = stim.answer;
    }

    return sliderStart;
  },
  // step: 1,
  step: 'any',
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
    const { buttonLayout, keyHelpers } = taskStore();
    const distractors = taskStore().nextStimulus;

    const wrapper = document.getElementById('jspsych-html-slider-response-wrapper');
    const buttonContainer = document.createElement('div');

    if (buttonLayout === 'default') {
      buttonContainer.id = 'slider-btn-container';
    }

    // don't apply layout if there aren't exactly 3 button options
    if (!(buttonLayout === 'triple' && distractors.length !== 2)) {
      buttonContainer.classList.add(`${buttonLayout}-layout`);
    }

    if (taskStore().nextStimulus.trialType === 'Number Line 4afc') {
      // don't let participant move slider
      slider.disabled = true;

      wrapper.style.margin = '0 0 2rem 0';

      // disable continue button and make invisible
      const continueBtn = document.getElementById('jspsych-html-slider-response-next');
      continueBtn.disabled = true;
      continueBtn.style.visibility = 'hidden';

      const { answer, distractors } = taskStore().nextStimulus;

      distractors.push(answer);

      taskStore('target', answer);
      taskStore('choices', distractors);

      const responseChoices = taskStore().choices;

      // create buttons
      for (let i = 0; i < responseChoices.length; i++) {
        const btnWrapper = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = responseChoices[i];
        btn.classList.add('secondary');
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

          if (keyHelpers && !isTouchScreen && buttonLayout !== 'default') {
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
      const continueBtn = document.getElementById('jspsych-html-slider-response-next');
      if (continueBtn) {
        continueBtn.classList.add('primary');
      }

      const slider = document.getElementById('jspsych-html-slider-response-response');

      slider.addEventListener('input', () => (chosenAnswer = slider.value));
    }

    wrapper.appendChild(buttonContainer);

    // play audio cue
    const contentWrapper = document.getElementById('jspsych-content'); 
    const prompt = document.getElementById('jspsych-html-slider-response-wrapper'); 
    const stimulus = taskStore().nextStimulus; 
    const responseType = stimulus.trialType.includes('4afc') ? 'button' : 'slider';

    setUpAudio(contentWrapper, prompt, responseType)

  },
  on_finish: (data) => {
    // Need to remove event listener after trial completion or they will stack and cause an error.
    document.removeEventListener('keydown', captureBtnValue);

    const sliderScoringThreshold = 0.05 // proportion of maximum slider value that response must fall within to be scored correct
    const stimulus = taskStore().nextStimulus;
    if (stimulus.trialType === 'Number Line 4afc') {
      data.correct = chosenAnswer === taskStore().target;
      if (!(stimulus.assessmentStage === 'practice_response')) {
        if (data.correct) {
          taskStore('numIncorrect', 0);
        } else {
          taskStore.transact('numIncorrect', (oldVal) => oldVal + 1);
        }
      }
    } else {
      data.correct = (Math.abs(chosenAnswer - stimulus.answer) / stimulus.item[1]) < sliderScoringThreshold;
    }

    const response = chosenAnswer;
    const responseType = stimulus.trialType.includes('4afc') ? 'button' : 'slider';
    const answer = stimulus.answer;

    jsPsych.data.addDataToLastTrial({
      item: stimulus.item,
      answer: answer,
      response: _toNumber(response),
      responseType: responseType,
      distractors: stimulus.distractors,
      corpusTrialType: stimulus.trialType,
      // slider_start: stimulus.item[1] === 1 ? sliderStart / 100 : sliderStart,
      slider_start: sliderStart,
    });
  
    setSkipCurrentBlock(stimulus.trialType);
  },
};
