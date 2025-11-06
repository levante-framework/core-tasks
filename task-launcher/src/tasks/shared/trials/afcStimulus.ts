// For all tasks except: H&F, Memory Game, Same Different Selection
import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import _toNumber from 'lodash/toNumber';
import { jsPsych, isTouchScreen } from '../../taskSetup';
import {
  arrowKeyEmojis,
  replayButtonSvg,
  setupReplayAudio,
  setSkipCurrentBlock,
  PageAudioHandler,
  PageStateHandler,
  camelize,
  setSentryContext,
  handleStaggeredButtons,
  updateTheta,
  addPracticeButtonListeners,
  enableOkButton,
} from '../helpers';
import { mediaAssets } from '../../..';
import { finishExperiment } from '.';
import { taskStore } from '../../../taskStore';

const replayButtonHtmlId = 'replay-btn-revisited';
// Previously chosen responses for current practice trial
let practiceResponses = [];
let trialsOfCurrentType = 0;
let startTime: number;
let keyboardFeedbackHandler: (ev: KeyboardEvent) => void;
const incorrectPracticeResponses: Array<string | null> = [];

const getKeyboardChoices = (itemLayoutConfig: LayoutConfigType) => {
  const buttonLength = itemLayoutConfig.response.values.length;
  if (buttonLength === 1) {
    // instruction trial
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

function getStimulus(layoutConfigMap: Record<string, LayoutConfigType>, trial?: StimulusType) {
  const stim = trial || taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
  if (itemLayoutConfig) {
    const audioPath = itemLayoutConfig?.playAudioOnLoad ? camelize(stim.audioFile) : 'nullAudio';
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
  promptClassList: string[],
) => {
  let template = '<div class="lev-stimulus-container">';

  template += `
    <button id="${replayButtonHtmlId}" class="replay">
      ${replayButtonSvg}
    </button>
  `;

  if (prompt) {
    let containerClass = 'lev-row-container instruction';
    if (promptClassList) {
      containerClass = promptClassList.join(' ');
    }

    template += `
      <div class="${containerClass}">
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
    let containerClass = equalSizeStim ? 'lev-stim-content' : 'lev-stim-content-x-3';
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

function getPrompt(layoutConfigMap: Record<string, LayoutConfigType>, trial?: StimulusType) {
  // showItem itemIsImage
  const stim = trial || taskStore().nextStimulus;
  const t = taskStore().translations;
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];

  if (itemLayoutConfig) {
    const {
      prompt: { enabled: promptEnabled },
      classOverrides: { stimulusContainerClassList, promptClassList },
      equalSizeStim,
      showStimImage,
      stimText: stimulusTextConfig,
    } = itemLayoutConfig;
    const mediaAsset = stimulusTextConfig?.value
      ? mediaAssets.images[camelize(stimulusTextConfig.value)] || mediaAssets.images['blank']
      : null;
    const prompt = promptEnabled ? t[camelize(stim.audioFile)] : null;
    const mediaSrc = showStimImage ? mediaAsset : null;
    const mediaAlt = stimulusTextConfig?.value || `Image not loading: ${mediaSrc}. Please continue the task.`;
    const stimText = stimulusTextConfig ? stimulusTextConfig.displayValue : null;
    return getPromptTemplate(
      prompt,
      mediaSrc,
      mediaAlt,
      stimText,
      equalSizeStim,
      stimulusContainerClassList,
      promptClassList,
    );
  }
}

function generateImageChoices(choices: string[], target: string) {
  const practiceUrl =
    'https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc';
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)] || practiceUrl;

    // if the task is running in a cypress test, the correct answer should be indicated with 'correct' class
    if (window.Cypress) {
      const isCorrect = choice === target;
      return isCorrect
        ? `<img src=${imageUrl} alt=${choice} class='correct'/>`
        : `<img src=${imageUrl} alt=${choice} />`;
    } else {
      return `<img src=${imageUrl} alt=${choice} />`;
    }
  });
}

function getButtonChoices(layoutConfigMap: Record<string, LayoutConfigType>, trial?: StimulusType) {
  const stimulus = trial || taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
  const { response } = itemLayoutConfig;
  const target = response.target;
  if (itemLayoutConfig) {
    const {
      isImageButtonResponse,
      response: { displayValues: buttonChoices },
    } = itemLayoutConfig;
    if (isImageButtonResponse) {
      return generateImageChoices(buttonChoices, target);
    }
    return buttonChoices;
  }
}

function getButtonHtml(layoutConfigMap: Record<string, LayoutConfigType>, trial?: StimulusType) {
  const stimulus = trial || taskStore().nextStimulus;
  //const isPracticeTrial = stimulus.assessmentStage === 'practice_response';
  const isPracticeTrial = true;
  const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
  if (itemLayoutConfig) {
    const classList = [...itemLayoutConfig.classOverrides.buttonClassList];
    const disableOkButton = itemLayoutConfig.disableOkButton;
    // TODO: Remove once we have a way to handle practive btns
    if (isPracticeTrial) {
      classList.push('practice-btn');
    }
    return `
      <button class='${classList.join(' ')}' ${disableOkButton ? 'disabled' : ''}>%choice%</button>
    `;
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

function doOnLoad(layoutConfigMap: Record<string, LayoutConfigType>, trial?: StimulusType) {
  const audioConfig: AudioConfigType = {
    restrictRepetition: {
      enabled: false,
      maxRepetitions: 1,
    },
    onEnded: () => {
      enableOkButton();
    },
  };

  // play trial audio
  PageAudioHandler.playAudio(getStimulus(layoutConfigMap, trial) || '', audioConfig);

  startTime = performance.now();

  const incorrectPracticeResponses: Array<string | null> = [];
  taskStore('incorrectPracticeResponses', incorrectPracticeResponses);

  const stim = trial || (taskStore().nextStimulus as StimulusType);
  const itemLayoutConfig = layoutConfigMap?.[stim.itemId];
  const playAudioOnLoad = itemLayoutConfig?.playAudioOnLoad;
  const pageStateHandler = new PageStateHandler(stim.audioFile, playAudioOnLoad);
  const isPracticeTrial = stim.assessmentStage === 'practice_response';
  const isInstructionTrial = stim.trialType === 'instructions';

  if (itemLayoutConfig.isStaggered || itemLayoutConfig.heavyPracticeStaggered) {
    // Handle the staggered buttons
    const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup') as HTMLDivElement;
    const imgButtons = Array.from(buttonContainer.children as HTMLCollectionOf<HTMLButtonElement>);
    let audioKeys: string[] = [];
    if (itemLayoutConfig.heavyPracticeStaggered) {
      audioKeys = ['same-different-selection-highlight-1', 'same-different-selection-highlight-2'];
    } else {
      for (let i = 0; i < imgButtons.length; i++) {
        const img = imgButtons[i].children[0].getElementsByTagName('img')[0];
        const audioKey = camelize(img?.alt ?? '');
        audioKeys.push(audioKey);
      }
    }
  
    handleStaggeredButtons(pageStateHandler, buttonContainer, audioKeys);
  }

  const currentTrialIndex = jsPsych.getProgress().current_trial_global;
  let twoTrialsAgoIndex = currentTrialIndex - 2;

  // Setup Sentry Context
  setSentryContext({
    itemId: stim.itemId,
    taskName: stim.task,
    pageContext: 'afcStimulus',
  });

  if (stim.task === 'math') {
    twoTrialsAgoIndex = currentTrialIndex - 3; // math has a fixation or something

    // flag correct answers with alt text for math if running a Cypress test
    if (window.Cypress && !isInstructionTrial) {
      const choices: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.secondary');
      choices[itemLayoutConfig.response.targetIndex].setAttribute('aria-label', 'correct');
    }
  }
  const twoTrialsAgoStimulus = jsPsych.data.get().filter({ trial_index: twoTrialsAgoIndex }).values();

  if (isPracticeTrial) {
    let feedbackHandler;
    feedbackHandler = addPracticeButtonListeners(stim, isTouchScreen, layoutConfigMap?.[stim.itemId]);

    if (feedbackHandler !== undefined) {
      keyboardFeedbackHandler = feedbackHandler;
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
    const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup') as HTMLDivElement;
    const responseButtons = buttonContainer.children as HTMLCollectionOf<HTMLButtonElement>;
    const totalResponseButtons = responseButtons.length;
    const { buttonLayout } = taskStore();

    if (itemLayoutConfig) {
      if (buttonLayout === 'diamond' && totalResponseButtons === 4) {
        // have to do it in the runtime
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
  }

  setupReplayAudio(pageStateHandler);
}

function doOnFinish(data: any, task: string, layoutConfigMap: Record<string, LayoutConfigType>, trial?: StimulusType) {
  PageAudioHandler.stopAndDisconnectNode();

  // note: nextStimulus is actually the current stimulus
  const stimulus = trial || taskStore().nextStimulus;
  const itemLayoutConfig = layoutConfigMap?.[stimulus.itemId];
  const { runCat, corpus } = taskStore();
  let responseValue = null;
  let target = null;
  let responseIndex = null;

  if (stimulus.trialType !== 'instructions') {
    if (itemLayoutConfig) {
      const { response } = itemLayoutConfig;
      if (!response) {
        throw new Error('Choices not defined in the config');
      }
      const keyboardChoices = getKeyboardChoices(itemLayoutConfig);
      responseIndex = data.keyboard_response
        ? keyboardChoices.findIndex((f) => f.toLowerCase() === data.keyboard_response.toLowerCase())
        : data.button_response;
      responseValue = response.values[responseIndex];
      target = response.target;
      data.correct = responseValue === target;
    }

    if (runCat) {
      updateTheta(stimulus, data.correct);
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
      responseLocation: responseIndex,
      itemUid: stimulus.itemUid,
      audioFile: stimulus.audioFile,
      corpus: corpus,
    });

    // corpusId and itemId fields are used by ROAR but not ROAD
    if (taskStore().storeItemId) {
      jsPsych.data.addDataToLastTrial({
        corpusId: taskStore().corpusId,
        itemId: stimulus.itemId,
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
    if (
      responseType === 'keyboard' ||
      data.response_source === 'keyboard' ||
      stimulus.assessmentStage === 'practice_response'
    ) {
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

  jsPsych.data.addDataToLastTrial({
    audioButtonPresses: PageAudioHandler.replayPresses,
  });

  if (stimulus.assessmentStage === 'test_response') {
    taskStore.transact('testTrialCount', (oldVal: number) => oldVal + 1);
  }

  if (itemLayoutConfig.inCorrectTrialConfig.onIncorrectTrial === 'skip' && !runCat) {
    setSkipCurrentBlock(stimulus.trialType);
  } else if (taskStore().numIncorrect >= taskStore().maxIncorrect && !runCat) {
    finishExperiment();
  }
}

export const afcStimulusTemplate = (
  {
    responseAllowed,
    promptAboveButtons,
    task,
    layoutConfigMap,
  }: {
    responseAllowed: boolean;
    promptAboveButtons: boolean;
    task: string;
    layoutConfigMap: Record<string, LayoutConfigType>;
  },
  trial?: StimulusType,
) => {
  return {
    type: jsPsychHtmlMultiResponse,
    response_allowed_while_playing: responseAllowed,
    data: () => {
      const stim = trial || taskStore().nextStimulus;
      let isPracticeTrial = stim.assessmentStage === 'practice_response';
      return {
        // not camelCase because firekit
        save_trial: true,
        assessment_stage: stim.assessmentStage,
        // not for firekit
        isPracticeTrial: isPracticeTrial,
      };
    },
    stimulus: () => getPrompt(layoutConfigMap, trial),
    prompt_above_buttons: promptAboveButtons,
    keyboard_choices: () => {
      const stim = trial || taskStore().nextStimulus;

      const itemLayoutConfig = layoutConfigMap[stim.itemId];
      return getKeyboardChoices(itemLayoutConfig);
    },
    button_choices: () => getButtonChoices(layoutConfigMap, trial),
    button_html: () => getButtonHtml(layoutConfigMap, trial),
    on_load: () => doOnLoad(layoutConfigMap, trial),
    on_finish: (data: any) => doOnFinish(data, task, layoutConfigMap, trial),
    response_ends_trial: () => {
      const stim = trial || taskStore().nextStimulus;

      return stim.assessmentStage !== 'practice_response';
    },
  };
};
