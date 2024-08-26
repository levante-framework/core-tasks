// For all tasks except: H&F, Memory Game, Same Different Selection
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { jsPsych, isTouchScreen } from '../../taskSetup';
import {
  prepareChoices,
  isPractice,
  fractionToMathML,
  arrowKeyEmojis,
  replayButtonSvg,
  setupReplayAudio,
  setSkipCurrentBlock,
  taskStore,
  PageAudioHandler,
  PageStateHandler,
} from '../../shared/helpers';
import { mediaAssets } from '../../..';
import _toNumber from 'lodash/toNumber';
import { camelize } from '@bdelab/roar-utils';
import { finishExperiment } from './';
const replayButtonHtmlId = 'replay-btn-revisited';
// Previously chosen responses for current practice trial
let practiceResponses = [];
let trialsOfCurrentType = 0;

let keyboardResponseMap = {};
// Only used for keyboard responses
let startTime;
let keyboardFeedbackHandler;
const incorrectPracticeResponses = [];

const showStaggeredBtnAndPlaySound = (
  index,
  btnList,
  pageState,
) => {
  const btn = btnList[index];
  btn.classList.remove(
    'lev-staggered-grayscale',
    'lev-staggered-opacity',
  );
  const img = btn.getElementsByTagName('img')?.[0];
  let audioAsset = mediaAssets.audio[camelize(img?.alt ?? '')];
  if (!audioAsset) {
    console.error('Audio Asset not available for:', img?.alt);
    audioAsset = mediaAssets.audio.nullAudio;
  }

  PageAudioHandler.playAudio(audioAsset, () => {
    if (index + 1 === btnList?.length) { // Last Element
      for (const jsResponseEl of btnList) {
        jsResponseEl.classList.remove('lev-staggered-disabled');
      }
      pageState.enableReplayBtn();
    } else { //recurse
      showStaggeredBtnAndPlaySound(index + 1, btnList, pageState);
    }
  });
};

const handleStaggeredButtons = async (layoutConfig, stim, pageState) => {
  if (
    !!layoutConfig?.staggered?.enabled
    && (layoutConfig?.staggered?.trialTypes || []).includes(stim.trialType)
  ) {
      const parentResponseDiv = document.getElementById('jspsych-audio-multi-response-btngroup');
      let i = 0;
      const stimulusDuration = await pageState.getStimulusDurationMs();
      const intialDelay = stimulusDuration + 300;

      // Disable the replay button till this animation is finished
      setTimeout(() => {
        pageState.disableReplayBtn();
      }, stimulusDuration + 110);

      for (const jsResponseEl of parentResponseDiv.children) {
        // disable the buttons so that they are not active during the animation
        jsResponseEl.classList.add(
          'lev-staggered-responses',
          'lev-staggered-disabled',
          'lev-staggered-grayscale',
          'lev-staggered-opacity',
        );
      }
      setTimeout(() => {
        showStaggeredBtnAndPlaySound(
          0,
          Array.from(parentResponseDiv?.children),
          pageState,
        );
      }, intialDelay);
      
  }
};

function getStimulus(layoutConfig) {
  if (!!layoutConfig?.noAudio){
    return mediaAssets.audio.nullAudio;
  }
  const stim = taskStore().nextStimulus;
  if (!stim.audioFile) return mediaAssets.audio.nullAudio;
  if (!mediaAssets.audio[camelize(stim.audioFile)]) return mediaAssets.audio.nullAudio;
  // all tasks should have the replay button play whatever is in stim.audioFile (might be just prompt/instructions)

  if ((stim.task === 'Mental Rotation') && stim.assessmentStage !== 'practice_response' && stim.trialType !== 'instructions') {
    return mediaAssets.audio.nullAudio;
  }

  if (
    stim.audioFile != '' ||
    stim.trialType === 'Number Identification' ||
    stim.task === 'TROG' ||
    stim.task === 'vocab' ||
    trialsOfCurrentType < 3
  ) {
    return mediaAssets.audio[camelize(stim.audioFile)];
  } else {
    return mediaAssets.audio.nullAudio;
  }
}

const getPromptTemplate = (prompt, mediaSrc, mediaAlt, stimText, equalSizeStim) => {
  let template = `
    <div class="lev-stimulus-container">
      <button id="${replayButtonHtmlId}" class="replay">
        ${replayButtonSvg}
      </button>` ;

  if (prompt) {
    template += `
      <div class="lev-row-container instruction">
        <p>${prompt}</p>
      </div>
    `;
  }
  if (mediaSrc || stimText) {
    let contentTemplate = '';
    if (mediaSrc) {
      contentTemplate += `
        <img 
          src=${mediaSrc}
          alt=${mediaAlt}
        />
      `;
    }

    if (stimText) {
      contentTemplate += `
        <p>${stimText}</p>
      `;
    }
    const containerClass = equalSizeStim
      ? 'lev-stim-content'
      : 'lev-stim-content-x-3';
    template += `
      <div class=${containerClass}>
        ${contentTemplate}
      </div>
    `;
  }
  template += '</div>';
  return template;
};

function getPrompt(task, layoutConfig) {
  // showItem itemIsImage
  const stim = taskStore().nextStimulus;
  const t = taskStore().translations;
  const stimTrialType = stim.trialType;
  const stimTask = stim.task;

  let stimItem;
  if (stim.trialType === 'Fraction') {
    stimItem = fractionToMathML(stim.item);
  } else {
    stimItem = stim.item;
  }

  if (
    ['Number Identification', 'Number Comparison'].includes(stimTrialType) || 
    (!(layoutConfig?.showPrompt) && stimTrialType != 'instructions') // vocab & TROG tasks should not show prompts
  ) {
    return getPromptTemplate(null, null, null, null, false);
  } else if (['vocab', 'trog'].includes(task)) {
    return getPromptTemplate(t[camelize(stim.audioFile)], null, null, null, false);
  } else if (['Mental Rotation'].includes(stimTask)) {
    const mediaSrc = stimItem 
      ? mediaAssets.images[camelize(stimItem)] || mediaAssets.images['blank']
      : null;
    const mediaAlt = stimItem || 'Stimulus';
    return getPromptTemplate(t[camelize(stim.audioFile)], mediaSrc, mediaAlt, null, true);
  } else if (
    ['Matrix Reasoning', 'instructions'].includes(stimTask) ||
    stim.trialType === 'instructions'
  ) {
    const mediaSrc = stimItem 
      ? mediaAssets.images[camelize(stimItem)] || mediaAssets.images['blank']
      : null;
    const mediaAlt = stimItem || 'Stimulus';
    return getPromptTemplate(t[camelize(stim.audioFile)], mediaSrc, mediaAlt, null, false);
  } else if (task === 'theory-of-mind') {
    const mediaSrc = stimItem 
      ? mediaAssets.images[camelize(stimItem)] || mediaAssets.images['blank']
      : null;
    const mediaAlt = stimItem || 'Stimulus';
    return getPromptTemplate(null, mediaSrc, mediaAlt, null, false);
  } else if (task === 'egma-math') {
    return getPromptTemplate(t[camelize(stim.audioFile)], null, null, stimItem, false);
  }

}

function generateImageChoices(choices) {
  const practiceUrl =
    'https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc';
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)] || practiceUrl;
    return `<img src=${imageUrl} alt=${choice} />`;
  });
}

function getButtonChoices(task) {
  const stimulus = taskStore().nextStimulus;
  if (stimulus.trialType === 'instructions') {
    return ['OK'];
  }

  const { answer, distractors } = stimulus;
  let trialInfo =
    stimulus.task === 'Mental Rotation'
      ? prepareChoices(answer, distractors, false, stimulus.trialType)
      : prepareChoices(answer, distractors, true, stimulus.trialType);

  if (
    ['vocab', 'trog', 'matrix-reasoning', 'mental-rotation', 'theory-of-mind'].includes(task) &&
    stimulus.trialType !== 'instructions'
  ) {
    return generateImageChoices(trialInfo.choices);
  }

  return trialInfo.choices; // Default return if no special conditions met
}

function getButtonHtml(task) {
  const stimulus = taskStore().nextStimulus;
  // TODO: add trial_type column to math item bank
  if (stimulus.trialType === 'instructions') {
    return "<button class='primary'>%choice%</button>";
  } 
  if (stimulus.trialType === 'Fraction') {
    return "<button class='secondary'>%choice%</button>";
  } else if (task === 'egma-math') {
    // practice-btn class does not add any styles, only used for querySelector
    return `<button class='secondary ${stimulus.assessmentStage === 'practice_response' ? 'practice-btn' : ''}'>%choice%</button>`;
  } else {
    return `<button class='${stimulus.assessmentStage === 'practice_response' ? 'practice-btn' : ''}'>%choice%</button>`;
  }
}

function enableBtns(btnElements) {
  btnElements.forEach((btn) => (btn.disabled = false));
}

function handlePracticeButtonPress(btn, stim, practiceBtns ,isKeyBoardResponse, responsevalue) {
  const choice = btn?.children?.length ? btn.children[0].alt : btn.textContent;
  const isCorrectChoice = choice?.toString() === stim.answer?.toString();
  let feedbackAudio;
  if (isCorrectChoice) {
    btn.classList.add('practice-correct');
    feedbackAudio = mediaAssets.audio.feedbackGoodJob;
    setTimeout(
      () => jsPsych.finishTrial({
        response: choice,
        incorrectPracticeResponses, 
        button_response: !isKeyBoardResponse ? responsevalue : null,
        keyboard_response: isKeyBoardResponse ? responsevalue : null,
      }),
      1000,
    );
  } else {
    btn.classList.add('practice-incorrect');
    feedbackAudio = mediaAssets.audio.feedbackTryAgain;
    // jspysch disables the buttons for some reason, so re-enable them
    setTimeout(() => enableBtns(practiceBtns), 500);
    incorrectPracticeResponses.push(choice);
  }
  PageAudioHandler.playAudio(feedbackAudio);
}

async function keyboardBtnFeedback(e, practiceBtns, stim) {
  let allowedKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

  if (stim.distractors.length === 1) {
    allowedKeys = ['ArrowLeft', 'ArrowRight'];
  }

  if (allowedKeys.includes(e.key)) {
    const choice = keyboardResponseMap[e.key.toLowerCase()];
    const btnClicked = Array.from(practiceBtns).find(btn => {
      const btnOption = btn?.children?.length ? btn.children[0].alt : btn.textContent;
      return (btnOption || '').toString() === (choice || '')?.toString();
    });
    if (btnClicked) {
      handlePracticeButtonPress(btnClicked, stim, practiceBtns, true, e.key.toLowerCase());
    }
  }
}

function addKeyHelpers(el, keyIndex) {
  const { keyHelpers } = taskStore();
  if (keyHelpers && !isTouchScreen) {
    const arrowKeyBorder = document.createElement('div');
    arrowKeyBorder.classList.add('arrow-key-border');

    const arrowKey = document.createElement('p');
    arrowKey.innerHTML = arrowKeyEmojis[keyIndex][1];
    arrowKey.style.textAlign = 'center';
    arrowKey.style.margin = '0';
    arrowKeyBorder.appendChild(arrowKey);
    el.appendChild(arrowKeyBorder);
  }
}

function doOnLoad(task, layoutConfig, layoutConfigMap) {
  startTime = performance.now();

  const stim = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
  const pageStateHandler = new PageStateHandler(stim.audioFile);
  const isPracticeTrial = stim.assessmentStage === 'practice_response';
  const isInstructionTrial = stim.trialType === 'instructions';
  // Handle the staggered buttons
  handleStaggeredButtons(layoutConfig, stim, pageStateHandler);
  const currentTrialIndex = jsPsych.getProgress().current_trial_global;
  let twoTrialsAgoIndex = currentTrialIndex - 2;
  if (stim.task === 'math') {
    twoTrialsAgoIndex = currentTrialIndex - 3; // math has a fixation or something
  }
  const twoTrialsAgoStimulus = jsPsych.data.get().filter({ trial_index: twoTrialsAgoIndex }).values();
  
  if (isPracticeTrial) {
    const practiceBtns = document.querySelectorAll('.practice-btn');

    practiceBtns.forEach((btn, i) =>
      btn.addEventListener('click', async (e) => {
        handlePracticeButtonPress(btn, stim, practiceBtns, false, i);
      }),
    );

    if (!isTouchScreen) {
      keyboardFeedbackHandler = (e) => keyboardBtnFeedback(e, practiceBtns, stim);
      document.addEventListener('keydown', keyboardFeedbackHandler);
    }
  }

  // should log trialsOfCurrentType - race condition
  if (stim.task === 'math') {
    if (twoTrialsAgoStimulus != undefined && stim.trialType === twoTrialsAgoStimulus[0]?.trialType) {
      trialsOfCurrentType += 1;
    } else {
      trialsOfCurrentType = 0;
    }
  } else {
    if (!isPracticeTrial && !isInstructionTrial) {
      trialsOfCurrentType += 1;
    }
  }

  if (stim.trialType !== 'instructions') {
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup');

    if (itemLayoutConfig) {
      buttonContainer.classList.add(...itemLayoutConfig.classOverrides.buttonContainerClassList);
    } else {
      // TODO REMOVE AFTER LAYOUTCONFIG IMPLEMENTATION
      buttonContainer.classList.add(`lev-response-row`);
      buttonContainer.classList.add(`multi-4`);
    }

    let responseChoices 
    if (stim.trialType === 'Fraction') {
      responseChoices = taskStore().nonFractionSelections;
    } else {
      responseChoices = taskStore().choices;
    }

    Array.from(buttonContainer.children).forEach((el, i) => {

      // Map arrow to response choice.
      // 2afc layout uses left and right arrow keys. The order of the arrrow
      // key array allows for the correct mapping for other layouts.
      const keyIndex = buttonContainer.children.length === 2 ? i + 1 : i;
      keyboardResponseMap[arrowKeyEmojis[keyIndex][0]] = responseChoices[i];

      if (itemLayoutConfig) {
        el.children[0].classList.add(...itemLayoutConfig.classOverrides.buttonClassList);
      } else {
        // TODO REMOVE AFTER LAYOUTCONFIG IMPLEMENTATION
        if (task !== 'egma-math') {
          if (task === 'mental-rotation') {
            el.children[0].classList.add('image-large');
          } else if (task === 'vocab' || task === 'trog') {
            el.children[0].classList.add('image-medium'); 
          } else {
            el.children[0].classList.add('image');
          }
        }
      }

      addKeyHelpers(el, keyIndex);
    });

    // update the trial number
    taskStore.transact('trialNumSubtask', (oldVal) => oldVal + 1);
    // update total real trials
    if (isPracticeTrial) {
      taskStore.transact('trialNumTotal', (oldVal) => oldVal + 1);
    }
  }

  setupReplayAudio(pageStateHandler);
}

function doOnFinish(data, task) {
  PageAudioHandler.stopAndDisconnectNode();

  // note: nextStimulus is actually the current stimulus
  const stimulus = taskStore().nextStimulus;
  // target is the actual value as a string
  const target = taskStore().target;
  let responseValue = null

  if (stimulus.trialType !== 'instructions') {
    if (data.keyboard_response) {
      data.correct = keyboardResponseMap[data.keyboard_response] === target;
      responseValue = keyboardResponseMap[data.keyboard_response];
    } else {
      data.correct = data.button_response === taskStore().correctResponseIdx;
      responseValue = stimulus.trialType === 'Fraction' ? taskStore().nonFractionSelections[data.button_response] : taskStore().choices[data.button_response];
    }

    // check response and record it
    const responseType = data.button_response ? 'mouse' : 'keyboard';

    // update running score and answer lists
    if (data.correct) {
      if (!isPractice(stimulus.notes)) {
        // practice trials don't count toward total
        taskStore.transact('totalCorrect', (oldVal) => oldVal + 1);
        taskStore('numIncorrect', 0); // reset incorrect trial count
      }
      practiceResponses = [];
    } else {
      // Only increase incorrect trials if response is incorrect not a practice trial
      if (!isPractice(stimulus.notes)) {
        taskStore.transact('numIncorrect', (oldVal) => oldVal + 1);
      }

      practiceResponses.push(responseValue);
    }

    jsPsych.data.addDataToLastTrial({
      // specific to this trial
      item: _toNumber(stimulus.item) || stimulus.item,
      answer: target,
      distractors: stimulus.distractors,
      corpusTrialType: stimulus.trialType,
      responseType,
    });

    // corpusId and itemId fields are used by ROAR but not ROAD
    if (taskStore().storeItemId) {
      jsPsych.data.addDataToLastTrial({
        corpusId: taskStore().corpusId,
        itemId: stimulus.source + '-' + stimulus.origItemNum,
      });
    }

    // Adding this seperately or otherwise it will overide
    // the response value added from practice trials
    if (stimulus.assessmentStage !== 'practice_response') {
      jsPsych.data.addDataToLastTrial({
        response: responseValue,
      });
    }

    // adding manually since trial does not log it properly
    // for keyboard responses
    if (responseType === 'keyboard' || data.response_source === 'keyboard') {
      const endTime = performance.now();
      const calculatedRt = Math.round(endTime - startTime);
      jsPsych.data.addDataToLastTrial({
        rt: calculatedRt,
      });
    }

    // remove listner or it will stack since were adding it on the document itself
    if (stimulus.assessmentStage === 'practice_response') {
      document.removeEventListener('keydown', keyboardFeedbackHandler);
    }
  } else {
    // instructions
    taskStore('numIncorrect', 0); // reset incorrect trial count
    jsPsych.data.addDataToLastTrial({
      // false because it's not a real trial
      correct: false,
    });
  }

  if (task === 'egma-math') {
    setSkipCurrentBlock(stimulus.trialType);
  } else if ((taskStore().numIncorrect >= taskStore().maxIncorrect)) {
    finishExperiment();
  }
}

// { trialType, responseAllowed, promptAboveButtons, task }
export const afcStimulusTemplate = ({ trialType, responseAllowed, promptAboveButtons, task, layoutConfig, layoutConfigMap } = {}) => {
  // TODO: pull out task-specific parameters (e.g., getPrompt(.., showPrompt=false) for Number Identification, TROG, ..)
  return {
    type: jsPsychAudioMultiResponse,
    response_allowed_while_playing: responseAllowed,
    data: () => {
      const stim = taskStore().nextStimulus;
      let isPracticeTrial = stim.assessmentStage === 'practice_response'; 
      return {
        // not camelCase because firekit
        save_trial: true,
        assessment_stage: stim.assessmentStage,
        // not for firekit
        isPracticeTrial: isPracticeTrial,
      };
    },
    stimulus: () => getStimulus(layoutConfig, trialType),
    prompt: () => getPrompt(task, layoutConfig, trialType),
    prompt_above_buttons: promptAboveButtons,
    keyboard_choices: () => {
      return taskStore().nextStimulus.distractors?.length === 1
        ? ['ArrowLeft', 'ArrowRight']
        : ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    },
    button_choices: () => getButtonChoices(task, trialType),
    button_html: () => getButtonHtml(task, trialType),
    on_load: () => doOnLoad(task, layoutConfig, layoutConfigMap),
    on_finish: (data) => doOnFinish(data, task, trialType),
    response_ends_trial: () => (taskStore().nextStimulus.assessmentStage === 'practice_response' ? false : true),
  };
};

export const afcStimulus = ({ trialType, responseAllowed, promptAboveButtons, task, layoutConfig} = {}) => {
  return {
    timeline: [
      afcStimulusTemplate({
        trialType: trialType,
        responseAllowed: responseAllowed,
        promptAboveButtons: promptAboveButtons,
        task: task,
        layoutConfig
      }),
    ]
    }
};
