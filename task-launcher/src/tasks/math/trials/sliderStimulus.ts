import HTMLSliderResponse from '@jspsych/plugin-html-slider-response';
import _shuffle from 'lodash/shuffle';
import _toNumber from 'lodash/toNumber';
import { jsPsych, isTouchScreen, cat } from '../../taskSetup';
//@ts-ignore
import { camelize } from '@bdelab/roar-utils';
import { 
  arrowKeyEmojis, 
  setSkipCurrentBlock, 
  replayButtonSvg, 
  setupReplayAudio, 
  PageAudioHandler, 
  PageStateHandler, 
  setSentryContext, 
  updateTheta, 
  handlePracticeButtonPress, 
  keyboardBtnFeedback
} from '../../shared/helpers';
import { mediaAssets } from '../../..';
import { taskStore } from '../../../taskStore';

let chosenAnswer: number;
let responseIdx: number; 
let sliderStart: number;
let keyboardResponseMap: Record<string, any> = {};
let startTime: number; 
let incorrectPracticeResponses: Array<string | null> = []; 
let keyboardFeedbackHandler: (ev: KeyboardEvent) => void;
let keyboardResponseHandler: (ev: KeyboardEvent) => void; 

function setUpAudio(responseType: string) {
  const cue = responseType === 'button' ? 'numberLinePrompt1' : 'numberLineSliderPrompt1';
  const audioFile = mediaAssets.audio[cue] || '';
  
  PageAudioHandler.playAudio(audioFile, () => {
    // set up replay button audio after the first audio has played
    if (cue) {
      const pageStateHandler = new PageStateHandler(cue, true);
      setupReplayAudio(pageStateHandler);
    }
  });  
}

function captureValue(btnElement: HTMLButtonElement | null, event: Event & {key?: string}, i: number, isPractice: boolean) {
  let containerEl = document.getElementById('slider-btn-container') || null;

  if (!containerEl) {
    const layout = taskStore().buttonLayout;
    containerEl = document.getElementsByClassName(`${layout}-layout`)[0] as HTMLButtonElement;
  }

  Array.from(containerEl.children).forEach((el) => {
    el.children[0].id = '';
  });

  if (event?.key) {
    chosenAnswer = _toNumber(keyboardResponseMap[event.key.toLowerCase()]);
  } else {
    chosenAnswer = _toNumber(btnElement?.textContent);
  }

  responseIdx = i; 

  if (!isPractice) {
    jsPsych.finishTrial();
  }
}

// Defining the function here since we need a reference to it to remove the event listener later
function captureBtnValue(event: Event & {key?: string}, isPractice: boolean) {
  // record responseIdx in addition to value
  const responseIndex = event.key ? ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].indexOf(event.key) : -1; 
  responseIndex > -1 && captureValue(null, event, responseIndex, isPractice);
}

function getRandomValue(max: number, avoid: number, tolerance: number = 0.1) {
  const scaled_avoid = avoid / max;
  let result = Math.random();

  while (Math.abs(result - scaled_avoid) < tolerance) {
    result = Math.random();
  };

  return result * max;
}

export const slider = (trial?: StimulusType) => {
  return {
  type: HTMLSliderResponse,
  data: () => {
    return {
      save_trial: true,
      assessment_stage: (trial || taskStore().nextStimulus).assessmentStage,
      isPracticeTrial: (trial || taskStore().nextStimulus).assessmentStage === 'practice_response',
    };
  },
  stimulus: () => {
    const stim = trial || taskStore().nextStimulus;
    let t = taskStore().translations;

    const isSlider = stim.trialType === 'Number Line Slider';
    return (`
      <div class="lev-stimulus-container">
        <button id="replay-btn-revisited" class="replay">
          ${replayButtonSvg}
        </button>
        <div class="lev-row-container instruction">
          <p>
            ${t[camelize(stim.audioFile)]}
            ${isSlider ? '<br /> ' + stim.answer : ''}
          </p>
        </div>
      </div>
    `);
  },
  labels: () => (trial || taskStore().nextStimulus).item,
  // button_label: 'OK',
  require_movement: () => (trial || taskStore().nextStimulus).trialType === 'Number Line Slider',
  // slider_width: 800,
  min: () => (trial || taskStore().nextStimulus).item[0],
  max: () => (trial || taskStore().nextStimulus).item[1],
  // max: () => (taskStore().nextStimulus.item[1] === 1 ? 100 : taskStore().nextStimulus.item[1]),
  slider_start: () => {
    const stim = trial || taskStore().nextStimulus;

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
  // add gap if it is a practice trial because setup trial will not be immediately after
  post_trial_gap: () => (trial || taskStore().nextStimulus).assessmentStage === "practice_response" ? 350 : 0,
  on_load: () => {
    startTime = performance.now();

    const slider = document.getElementById('jspsych-html-slider-response-response') as HTMLButtonElement;
    const sliderLabels = document.getElementsByTagName('span') as HTMLCollectionOf<HTMLSpanElement>;
    Array.from(sliderLabels).forEach((el, i) => {
      //if (i == 1 || i == 2) {
      el.style.fontSize = '1.5rem';
      //}
    });
    const { buttonLayout, keyHelpers } = taskStore();
    const stim = (trial || taskStore().nextStimulus) as StimulusType;
    const { distractors } = stim;
    const isPractice = stim.assessmentStage === "practice_response";

    // Setup Sentry Context
    setSentryContext({
      itemId: stim.itemId,
      taskName: stim.task,
      pageContext: 'sliderStimulus',
    });

    const wrapper = document.getElementById('jspsych-html-slider-response-wrapper') as HTMLDivElement;
    const buttonContainer = document.createElement('div');

    if (buttonLayout === 'default') {
      buttonContainer.id = 'slider-btn-container';
    }

    // answer has not been pushed to distractor yet
    // support for diamond layout
    if (buttonLayout === 'diamond' && distractors.length === 3) {
      buttonContainer.classList.add('lev-response-row-diamond-layout');
    }

    if (stim.trialType === 'Number Line 4afc') {
      // don't let participant move slider
      slider.disabled = true;

      wrapper.style.margin = '0 0 2rem 0';

      // disable continue button and make invisible
      const continueBtn = document.getElementById('jspsych-html-slider-response-next') as HTMLButtonElement;
      continueBtn.disabled = true;
      continueBtn.style.visibility = 'hidden';

      const { answer, distractors } = stim;

      distractors.push(answer);

      taskStore('target', answer);
      taskStore('choices', _shuffle(distractors));

      const responseChoices = taskStore().choices;

      // create buttons
      for (let i = 0; i < responseChoices.length; i++) {
        const btnWrapper = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = responseChoices[i];

        // flag correct answer if running in cypress
        if (window.Cypress && (btn.textContent == answer)) {
          btn.setAttribute('aria-label', 'correct');
        }

        btn.classList.add('secondary');
        if (stim.assessmentStage === "practice_response") {
          btn.classList.add('practice-btn'); 
        }
        btn.addEventListener('click', (e) => captureValue(btn, e, i, isPractice));

        // To not duplicate event listeners
        if (i === 0) {
          keyboardResponseHandler = (e: KeyboardEvent) => captureBtnValue(e, isPractice);
          document.addEventListener('keydown', keyboardResponseHandler);
        }

        if (!(buttonLayout === 'triple' && distractors.length !== 2)) {

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

      const slider = document.getElementById('jspsych-html-slider-response-response') as HTMLButtonElement;

      slider.addEventListener('input', () => (chosenAnswer = Number(slider.value)));
    }

    wrapper.appendChild(buttonContainer);

    const stimulus = trial || taskStore().nextStimulus; 
    const responseType = stimulus.trialType.includes('4afc') ? 'button' : 'slider';

    setUpAudio(responseType); 

    if (stimulus.assessmentStage === "practice_response") {
        const practiceBtns: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.practice-btn');
    
        practiceBtns.forEach((btn, i) =>
          btn.addEventListener('click', async (e) => {
            incorrectPracticeResponses = handlePracticeButtonPress(btn, stim, practiceBtns, false, i, incorrectPracticeResponses);
          }),
        );
    
        if (!isTouchScreen) {
          keyboardFeedbackHandler = (e: KeyboardEvent) => keyboardBtnFeedback(e, practiceBtns, stim);
          document.addEventListener('keydown', keyboardFeedbackHandler);
        }
      }

  },
  on_finish: (data: any) => {
    const stimulus = trial || taskStore().nextStimulus;
    const isPractice = stimulus.assessmentStage === "practice_response"; 
    // Need to remove event listeners after trial completion or they will stack and cause an error.
    document.removeEventListener('keydown', keyboardResponseHandler);

    if (stimulus.assessmentStage === 'practice_response') {
      document.removeEventListener('keydown', keyboardFeedbackHandler);
    }
    const endTime = performance.now();
    const runCat = taskStore().runCat; 

    const sliderScoringThreshold = 0.05 // proportion of maximum slider value that response must fall within to be scored correct
    if (stimulus.trialType === 'Number Line 4afc') {
      data.correct = chosenAnswer === taskStore().target;
    } else {
      data.correct = (Math.abs(chosenAnswer - stimulus.answer) / stimulus.item[1]) < sliderScoringThreshold;
    }

    // update taskStore
    taskStore("isCorrect", data.correct);

    if (!(stimulus.assessmentStage === 'practice_response')) {
      if (data.correct) {
        taskStore('numIncorrect', 0);
        taskStore.transact('totalCorrect', (oldVal: number) => oldVal + 1);
      } else {
        taskStore.transact('numIncorrect', (oldVal: number) => oldVal + 1);
      }

      if (runCat) {
        updateTheta(stimulus, data.correct); 
      }
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
      audioButtonPresses: PageAudioHandler.replayPresses
    });

    if (responseType === 'button') {
      const calculatedRt = Math.round(endTime - startTime);

      jsPsych.data.addDataToLastTrial({
        rt: calculatedRt, 
        responseLocation: responseIdx, 
      });
    }
  
    setSkipCurrentBlock(stimulus.trialType);
  },
  }
};
