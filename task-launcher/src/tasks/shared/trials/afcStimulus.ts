// For all tasks except: H&F, Memory Game, Same Different Selection
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
// @ts-ignore
import { jsPsych, isTouchScreen } from '../../taskSetup';
import {
  arrowKeyEmojis,
  replayButtonSvg,
  setupReplayAudio,
  setSkipCurrentBlock,
  taskStore,
  PageAudioHandler,
  PageStateHandler,
  //@ts-ignore
} from '../helpers';
import { camelize } from '../helpers/camelize';
import { mediaAssets } from '../../..';
import _toNumber from 'lodash/toNumber';
// @ts-ignore
import { finishExperiment } from '.';
const replayButtonHtmlId = 'replay-btn-revisited';
// Previously chosen responses for current practice trial
let practiceResponses = [];
let trialsOfCurrentType = 0;
let startTime: number;
let keyboardFeedbackHandler: (ev: KeyboardEvent) => void;
const incorrectPracticeResponses: Array<string | null> = [];

const getKeyboardChoices = (itemLayoutConfig: LayoutConfigType) => {
  const buttonLength = itemLayoutConfig.response.values.length;
  if (buttonLength === 1) { // instruction trial
    return ['Enter'];
  }
  if (buttonLength === 2) {
    return ['ArrowLeft', 'ArrowRight'];
  }
  if (buttonLength === 3) {
    return ['ArrowUp', 'ArrowLeft', 'ArrowRight'];
  }
  if (buttonLength === 4) {
    return ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
  }
  throw new Error('More than 4 buttons are not supported yet');
};

const showStaggeredBtnAndPlaySound = (
  index: number,
  btnList: HTMLButtonElement[],
  pageState: PageStateHandler,
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

const handleStaggeredButtons = async (layoutConfig: LayoutConfigType, pageState: PageStateHandler) => {
  if (layoutConfig?.isStaggered) {
      const parentResponseDiv = document.getElementById('jspsych-audio-multi-response-btngroup') as HTMLDivElement;
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
          Array.from(parentResponseDiv?.children as HTMLCollectionOf<HTMLButtonElement>),
          pageState,
        );
      }, intialDelay);
      
  }
};

function getStimulus(layoutConfigMap: Record<string, LayoutConfigType>) {
  const stim = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
  if (itemLayoutConfig) {
    const audioPath = itemLayoutConfig?.noAudio ? 'nullAudio' : camelize(stim.audioFile);
    return mediaAssets.audio[audioPath];
  }
}


const getPromptTemplate = (
  prompt: string,
  mediaSrc: string | null,
  mediaAlt: string,
  stimText: string | null | undefined,
  equalSizeStim: boolean,
  stimulusContainerClassList: string[],
) => {
  let template = '<div class="lev-stimulus-container">';

  template += `
    <button id="${replayButtonHtmlId}" class="replay">
      ${replayButtonSvg}
    </button>
  `;

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
    // TODO: Remove after LayoutConfig implementation
    let containerClass = equalSizeStim
      ? 'lev-stim-content'
      : 'lev-stim-content-x-3';
    if (stimulusContainerClassList) {
      containerClass = stimulusContainerClassList.join(' ');
    }
    template += `
      <div class=${containerClass}>
        ${contentTemplate}
      </div>
    `;
  }
  template += '</div>';
  return template;
};

function getPrompt(layoutConfigMap: Record<string, LayoutConfigType>) {
  // showItem itemIsImage
  const stim = taskStore().nextStimulus;
  const t = taskStore().translations;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];

  if (itemLayoutConfig) {
    const {
      prompt: {
        enabled: promptEnabled,
      },
      classOverrides: {
        stimulusContainerClassList
      },
      equalSizeStim,
      showStimImage,
      stimText: stimulusTextConfig,
    } = itemLayoutConfig;
    const mediaAsset = stimulusTextConfig?.value
      ? mediaAssets.images[camelize(stimulusTextConfig.value)] || mediaAssets.images['blank']
      : null;
    const prompt = promptEnabled ? t[camelize(stim.audioFile)] : null;
    const mediaSrc = showStimImage ? mediaAsset : null;
    const mediaAlt = stimulusTextConfig?.value || 'Stimulus';
    const stimText = stimulusTextConfig ? stimulusTextConfig.displayValue : null;
    return getPromptTemplate(
      prompt,
      mediaSrc,
      mediaAlt,
      stimText,
      equalSizeStim,
      stimulusContainerClassList,
    );
  }
}

function generateImageChoices(choices: string[]) {
  const practiceUrl =
    'https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc';
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)] || practiceUrl;
    return `<img src=${imageUrl} alt=${choice} />`;
  });
}

function getButtonChoices(layoutConfigMap: Record<string, LayoutConfigType>) {
  const stimulus = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
  if (itemLayoutConfig) {
    const {
      isImageButtonResponse,
      response: {
        values: buttonChoices,
      },
    } = itemLayoutConfig;
    if (isImageButtonResponse) {
      return generateImageChoices(buttonChoices);
    }
    return buttonChoices;
  }
}

function getButtonHtml(layoutConfigMap: Record<string, LayoutConfigType>) {
  const stimulus = taskStore().nextStimulus;
  const isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
  if (itemLayoutConfig) {
    const classList = [...itemLayoutConfig.classOverrides.buttonClassList];
    // TODO: Remove once we have a way to handle practive btns
    if (isPracticeTrial) {
      classList.push('practice-btn');
    }
    return `
      <button class='${classList.join(' ')}'>%choice%</button>
    `;
  }
}

function enableBtns(btnElements: NodeListOf<HTMLButtonElement>) {
  btnElements.forEach((btn) => (btn.disabled = false));
}

function handlePracticeButtonPress(
  btn: HTMLButtonElement,
  stim: StimulusType,
  practiceBtns: NodeListOf<HTMLButtonElement>,
  isKeyBoardResponse: boolean,
  responsevalue: string | number,
) {
  const choice = btn?.children?.length ? (btn.children[0] as HTMLImageElement).alt : btn.textContent;
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

async function keyboardBtnFeedback(e: KeyboardEvent, practiceBtns: NodeListOf<HTMLButtonElement>, stim: StimulusType, itemConfig: LayoutConfigType) {
  const allowedKeys = getKeyboardChoices(itemConfig);
  const choices = itemConfig?.response?.values || [];
  const index = allowedKeys.findIndex(f => f.toLowerCase() === e.key.toLowerCase())

  if (allowedKeys.includes(e.key)) {
    const choice = choices[index];
    const btnClicked = Array.from(practiceBtns).find(btn => {
      const btnOption = btn?.children?.length ? (btn.children[0] as HTMLImageElement).alt : btn.textContent;
      return (btnOption || '').toString() === (choice || '')?.toString();
    });
    if (btnClicked) {
      handlePracticeButtonPress(btnClicked, stim, practiceBtns, true, e.key.toLowerCase());
    }
  }
}

function addKeyHelpers(el: HTMLElement, keyIndex: number) {
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

function doOnLoad(layoutConfigMap: Record<string, LayoutConfigType>) {
  startTime = performance.now();

  const stim = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
  const noAudio = itemLayoutConfig?.noAudio;
  const pageStateHandler = new PageStateHandler(stim.audioFile, !noAudio);
  const isPracticeTrial = stim.assessmentStage === 'practice_response';
  const isInstructionTrial = stim.trialType === 'instructions';
  // Handle the staggered buttons
  handleStaggeredButtons(itemLayoutConfig, pageStateHandler);
  const currentTrialIndex = jsPsych.getProgress().current_trial_global;
  let twoTrialsAgoIndex = currentTrialIndex - 2;
  if (stim.task === 'math') {
    twoTrialsAgoIndex = currentTrialIndex - 3; // math has a fixation or something
  }
  const twoTrialsAgoStimulus = jsPsych.data.get().filter({ trial_index: twoTrialsAgoIndex }).values();
  
  if (isPracticeTrial) {
    const practiceBtns: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.practice-btn');

    practiceBtns.forEach((btn, i) =>
      btn.addEventListener('click', async (e) => {
        handlePracticeButtonPress(btn, stim, practiceBtns, false, i);
      }),
    );

    if (!isTouchScreen) {
      keyboardFeedbackHandler = (e: KeyboardEvent) => keyboardBtnFeedback(e, practiceBtns, stim, itemLayoutConfig);
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
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup') as HTMLDivElement;

    if (itemLayoutConfig) {
      buttonContainer.classList.add(...itemLayoutConfig.classOverrides.buttonContainerClassList);
    }

    Array.from(buttonContainer.children as HTMLCollectionOf<HTMLButtonElement>).forEach((el, i) => {
      const keyIndex = buttonContainer.children.length === 2 ? i + 1 : i;
      addKeyHelpers(el, keyIndex);
    });

    // update the trial number
    taskStore.transact('trialNumSubtask', (oldVal: number) => oldVal + 1);
    // update total real trials
    if (isPracticeTrial) {
      taskStore.transact('trialNumTotal', (oldVal: number) => oldVal + 1);
    }
  }

  setupReplayAudio(pageStateHandler);
}

function doOnFinish(data: any, task: string, layoutConfigMap: Record<string, LayoutConfigType>) {
  PageAudioHandler.stopAndDisconnectNode();

  // note: nextStimulus is actually the current stimulus
  const stimulus = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
  // target is the actual value as a string
  const target = taskStore().target;
  let responseValue = null

  if (stimulus.trialType !== 'instructions') {
    if (itemLayoutConfig) {
      const { response } = itemLayoutConfig;
      if (!response) {
        throw new Error('Choices not defined in the config');
      }
      const keyboardChoices = getKeyboardChoices(itemLayoutConfig);
      const responseIndex = data.keyboard_response
        ? keyboardChoices.findIndex(f => f.toLowerCase() === data.keyboard_response.toLowerCase())
        : data.button_response;
      responseValue = response.values[responseIndex];
      data.correct = responseValue === response.target;
      console.log('mark://', 'Response values', { correct: data.correct, responseValue, response });
    }

    // check response and record it
    const responseType = data.button_response ? 'mouse' : 'keyboard';

    // update running score and answer lists
    if (data.correct) {
      if (stimulus.assessmentStage !== 'practice_response') {
        // practice trials don't count toward total
        taskStore.transact('totalCorrect', (oldVal: number) => oldVal + 1);
        taskStore('numIncorrect', 0); // reset incorrect trial count
      }
      practiceResponses = [];
    } else {
      // Only increase incorrect trials if response is incorrect not a practice trial
      if (stimulus.assessmentStage !== 'practice_response') {
        taskStore.transact('numIncorrect', (oldVal: number) => oldVal + 1);
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

  if (itemLayoutConfig.inCorrectTrialConfig.onIncorrectTrial === 'skip') {
    setSkipCurrentBlock(stimulus.trialType);
  } else if ((taskStore().numIncorrect >= taskStore().maxIncorrect)) {
    finishExperiment();
  }
}

export const afcStimulusTemplate = (
  { responseAllowed, promptAboveButtons, task, layoutConfigMap }: {
    responseAllowed: boolean,
    promptAboveButtons: boolean,
    task: string,
    layoutConfigMap: Record<string, LayoutConfigType>,
  }
) => {
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
    stimulus: () => getStimulus(layoutConfigMap),
    prompt: () => getPrompt(layoutConfigMap),
    prompt_above_buttons: promptAboveButtons,
    keyboard_choices: () => {
      const stim = taskStore().nextStimulus;
      const itemLayoutConfig = layoutConfigMap[stim.itemId];
      return getKeyboardChoices(itemLayoutConfig);
    },
    button_choices: () => getButtonChoices(layoutConfigMap),
    button_html: () => getButtonHtml(layoutConfigMap),
    on_load: () => doOnLoad(layoutConfigMap),
    on_finish: (data: any) => doOnFinish(data, task, layoutConfigMap),
    response_ends_trial: () => (taskStore().nextStimulus.assessmentStage === 'practice_response' ? false : true),
  };
};
