// For all tasks except: H&F, Memory Game, Same Different Selection
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
// @ts-ignore
import { jsPsych, isTouchScreen } from '../../taskSetup';
import {
  arrowKeyEmojis,
  setupReplayAudio,
  setSkipCurrentBlock,
  taskStore,
  PageAudioHandler,
  PageStateHandler,
  //@ts-ignore
} from '../../shared/helpers';
import { camelize } from '../../shared/helpers/camelize';
import { mediaAssets } from '../../..';
import _toNumber from 'lodash/toNumber';
// @ts-ignore
import { finishExperiment } from '../../shared/trials';

// Previously chosen responses for current practice trial
let practiceResponses = [];
let trialsOfCurrentType = 0;
let keyboardFeedbackHandler: (ev: KeyboardEvent) => void;
const incorrectPracticeResponses: Array<string | null> = [];

const handleStaggeredButtons = async (layoutConfig: LayoutConfigType, pageState: PageStateHandler) => {
  if (layoutConfig?.isStaggered) {
      const parentResponseDiv = document.getElementById('jspsych-audio-multi-response-btngroup') as HTMLDivElement;
      const stimulusDuration = await pageState.getStimulusDurationMs();

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
      
  }
};

function getStimulus(layoutConfigMap: Record<string, LayoutConfigType>) {
  const stim = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
  if (itemLayoutConfig) {
    const audioPath = itemLayoutConfig?.playAudioOnLoad ? camelize(stim.audioFile) : 'nullAudio';
    return mediaAssets.audio[audioPath];
  }
}

const getPromptTemplate = (
  prompt: string,
  story?: string | null,
) => {
  let template = '<div class="lev-stimulus-container">';
    template += `
      <div class="lev-row-container instruction-no-border">
        <p>${story}</p>
      </div>
      <div class="lev-row-container roar-instruction-question">
        <p>${prompt}</p>
      </div>
    `;
  template += '</div>';
  return template;
};

function getPrompt(layoutConfigMap: Record<string, LayoutConfigType>) {
  // showItem itemIsImage
  const stim = taskStore().nextStimulus;
  const t = taskStore().translations;
  let itemLayoutConfig = layoutConfigMap?.[stim.itemId];

  if (itemLayoutConfig) {
    const {
      prompt: {
        enabled: promptEnabled,
      },
      story,
      stimText: stimulusTextConfig,
    } = itemLayoutConfig;
    let prompt = promptEnabled ? t[camelize(stim.audioFile)] : null ;
    return getPromptTemplate(
      prompt,
      story,
    );
  }
}


function getButtonChoices(layoutConfigMap: Record<string, LayoutConfigType>) {
  const stimulus = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
  if (itemLayoutConfig) {
    const {
      response: {
        values: buttonChoices,
      },
    } = itemLayoutConfig;
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
    feedbackAudio = mediaAssets.audio.feedbackGoodJob ?? mediaAssets.audio.nullAudio;;
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
    feedbackAudio = mediaAssets.audio.feedbackTryAgain ?? mediaAssets.audio.nullAudio;;
    // jspysch disables the buttons for some reason, so re-enable them
    setTimeout(() => enableBtns(practiceBtns), 500);
    incorrectPracticeResponses.push(choice);
  }
  PageAudioHandler.playAudio(feedbackAudio);
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
  const stim = taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
  const playAudioOnLoad = itemLayoutConfig?.playAudioOnLoad;
  const pageStateHandler = new PageStateHandler(stim.audioFile, playAudioOnLoad);
  const isPracticeTrial = stim.assessmentStage === 'practice_response';
  const isInstructionTrial = stim.trialType === 'instructions';
  // Handle the staggered buttons
  handleStaggeredButtons(itemLayoutConfig, pageStateHandler);
  
  if (isPracticeTrial) {
    const practiceBtns: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.practice-btn');

    practiceBtns.forEach((btn, i) =>
      btn.addEventListener('click', async (e) => {
        handlePracticeButtonPress(btn, stim, practiceBtns, false, i);
      }),
    );

    if (!isTouchScreen) {
    //   keyboardFeedbackHandler = (e: KeyboardEvent) => keyboardBtnFeedback(e, practiceBtns, stim, itemLayoutConfig);
      document.addEventListener('keydown', keyboardFeedbackHandler);
    }
  }

    if (!isPracticeTrial && !isInstructionTrial) {
      trialsOfCurrentType += 1;
    }


  if (stim.trialType !== 'instructions') {
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup') as HTMLDivElement;
    const responseButtons = buttonContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    const totalResponseButtons = responseButtons.length;
    const { buttonLayout } = taskStore();

    if (itemLayoutConfig) {
      if (buttonLayout === 'diamond') { // have to do it in the runtime
        buttonContainer.classList.add('lev-response-row-diamond-layout');
      } else {
        buttonContainer.classList.add(...itemLayoutConfig.classOverrides.buttonContainerClassList);
      }
    }

    Array.from(responseButtons).forEach((el, i) => {
      const keyIndex = totalResponseButtons === 2 ? i + 1 : i;
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
  let responseValue = null
  let target = null; 
  let responseIndex = null; 

  if (stimulus.trialType !== 'instructions') {
    if (itemLayoutConfig) {
      const { response } = itemLayoutConfig;
      if (!response) {
        throw new Error('Choices not defined in the config');
      }
    //   const keyboardChoices = getKeyboardChoices(itemLayoutConfig);
      responseIndex = data.button_response;
      responseValue = response.values[responseIndex];
      target = response.target; 
      data.correct = responseValue === target;
    }

    // check response and record it
    const responseType = 'mouse';

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
      responseLocation: responseIndex, 
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

  jsPsych.data.addDataToLastTrial({
    audioButtonPresses: PageAudioHandler.replayPresses
  });

  if (itemLayoutConfig.inCorrectTrialConfig.onIncorrectTrial === 'skip') {
    setSkipCurrentBlock(stimulus.trialType);
  } else if ((taskStore().numIncorrect >= taskStore().maxIncorrect)) {
    finishExperiment();
  }
}

export interface AfcStimulusInput {
  responseAllowed: boolean;
  promptAboveButtons: boolean;
  task: string;
  layoutConfigMap: Record<string, LayoutConfigType>;
}

export const afcStimulusInference = (
  { responseAllowed, promptAboveButtons, task, layoutConfigMap }: AfcStimulusInput,
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
    button_choices: () => getButtonChoices(layoutConfigMap),
    button_html: () => getButtonHtml(layoutConfigMap),
    on_load: () => doOnLoad(layoutConfigMap),
    on_finish: (data: any) => doOnFinish(data, task, layoutConfigMap),
    response_ends_trial: () => (taskStore().nextStimulus.assessmentStage === 'practice_response' ? false : true),
  };
};
