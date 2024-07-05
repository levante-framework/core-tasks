// For all tasks except: H&F, Memory Game, Same Different Selection
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
//@ts-ignore
import { jsPsych, isTouchScreen } from '../taskSetup';
//@ts-ignore
import { prepareChoices, isPractice, replayButtonSvg, setupReplayAudio, taskStore, arrowKeyEmojis } from '../shared/helpers';
//@ts-ignore
import { mediaAssets } from '../..';
//@ts-ignore
import _toNumber from 'lodash/toNumber';
//@ts-ignore
import { camelize } from '@bdelab/roar-utils';
//@ts-ignore
import { finishExperiment } from '../shared/trials';

const replayButtonHtmlId = 'replay-btn-revisited';
// Previously chosen responses for current practice trial
let practiceResponses = [];
let currPracticeChoiceMix: Array<string> = [];
let currPracticeAnswerIdx: number | null;
let trialsOfCurrentType = 0;

let audioSource: AudioBufferSourceNode;
let keyboardResponseMap: Record<string, string> = {};
// Only used for keyboard responses
let startTime: number;
const incorrectPracticeResponses = [];

const buildTrialData = (stimulus: any, target: string, responseType: string, responseValue: any, data: any) => {
  const isKeyboardResponse = responseType === 'keyboard' || data.response_source === 'keyboard';
  const endTime = performance.now();
  const calculatedRt = Math.round(endTime - startTime);
  return ({
    // specific to this trial
    item: _toNumber(stimulus.item) || stimulus.item,
    answer: target,
    distractors: stimulus.distractors,
    corpusTrialType: stimulus.trialType,
    responseType,
    ...(taskStore().storeItemId ? ({
      corpusId: taskStore().corpusId,
      itemId: stimulus.source + '-' + stimulus.origItemNum,
    }) : null),
    ...(stimulus.notes !== 'practice' ? ({
      response: responseValue,
    }) : null),
    ...(isKeyboardResponse ? ({
      rt: calculatedRt,
    }): null),
  });
};

const generateKeyBoardResponseMap = (keyIndex: number, responseIndex: number) => {
  const responseChoices = taskStore().choices;
  keyboardResponseMap[arrowKeyEmojis[keyIndex][0]] = responseChoices[responseIndex];
};

const playAudio = async (audioUri: string) => {
  const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();
  // Returns a promise of the AudioBuffer of the preloaded file path.
  const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(audioUri);
  const audioSource = jsPsychAudioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(jsPsychAudioCtx.destination);
  audioSource.start(0);
};

const showStaggeredBtnAndPlaySound = (btn: HTMLButtonElement) => {
  btn.style.display = 'flex';
  btn.style.flexDirection = 'column';
  btn.style.alignItems = 'center';
  btn.style.maxWidth = 'none';
  const img = btn.getElementsByTagName('img')?.[0];
  if (img) {
    const altValue = img.alt;
    playAudio(mediaAssets.audio[camelize(altValue)]);
  }
}

function getStimulus() {
  const stim = taskStore().nextStimulus;
  return mediaAssets.audio[camelize(stim.audioFile)] || mediaAssets.audio.nullAudio
}

const getPromptTemplate = (prompt?: string, mediaSrc?: string, mediaAlt?: string, stimText?: string, equalSizeStim?: boolean) => {
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

function getPrompt() {
  const stim = taskStore().nextStimulus;
  const t = taskStore().translations;
  const stimItem = stim.item;

  const mediaSrc = stimItem 
      ? mediaAssets.images[camelize(stimItem)] || mediaAssets.images['blank']
      : null;
    const mediaAlt = stimItem || 'Stimulus';
  return getPromptTemplate(t[camelize(stim.audioFile)], mediaSrc, mediaAlt, undefined, false);

}

function generateImageChoices(choices: string[]) {
  const defaultUrl =
    'https://imgs.search.brave.com/w5KWc-ehwDScllwJRMDt7-gTJcykNTicRzUahn6-gHg/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9yZW5k/ZXIuZmluZWFydGFt/ZXJpY2EuY29tL2lt/YWdlcy9pbWFnZXMt/cHJvZmlsZS1mbG93/LzQwMC9pbWFnZXMt/bWVkaXVtLWxhcmdl/LTUvZmF0aGVyLWFu/ZC1kYXVnaHRlci1p/bi10aGUtb3V0ZXIt/YmFua3MtY2hyaXMt/d2Vpci5qcGc';
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)] || defaultUrl;
    return `<img src=${imageUrl} alt=${choice} />`;
  });
}

function getButtonChoices() {
  const stimulus = taskStore().nextStimulus;
  if (stimulus.trialType === 'instructions') {
    return ['OK'];
  }

  const { answer, distractors } = stimulus;
  const trialInfo = prepareChoices(answer, distractors, true, stimulus.trialType);
  return generateImageChoices(trialInfo.choices);

}

function getButtonHtml() {
  const stimulus = taskStore().nextStimulus;
  if (stimulus.trialType === 'instructions') {
    return "<button class='primary'>%choice%</button>";
  }
  return `<button class='${stimulus.notes === 'practice' ? 'practice-btn' : ''}'>%choice%</button>`;
}

function enableBtns(btnElements: HTMLButtonElement[]) {
  btnElements.forEach((btn) => (btn.disabled = false));
}

function doOnLoad() {
  startTime = performance.now();

  const stim = taskStore().nextStimulus;
  // const parentResponseDiv = document.getElementById('jspsych-audio-multi-response-btngroup');
  // if (parentResponseDiv) {
  //   parentResponseDiv.style.display = 'none';
  //   let i = 0;
  //   const intialDelay = 4000;
  //   for (const jsResponseEl of parentResponseDiv.children as HTMLCollectionOf<HTMLButtonElement>) {
  //     jsResponseEl.style.display = 'none';
  //     setTimeout(() => showStaggeredBtnAndPlaySound(jsResponseEl), intialDelay + 2000 * i);
  //     i += 1;
  //   }
  //   parentResponseDiv.style.display = 'flex';
  //   parentResponseDiv.style.flexDirection = 'row';
  // }
  


  if (stim.trialType !== 'instructions') {

    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup');

    buttonContainer?.classList.add(`lev-response-row`);
    buttonContainer?.classList.add(`multi-4`);
    Array.from(buttonContainer?.children as HTMLCollectionOf<HTMLButtonElement>).forEach((el, i) => {
      el.children[0].classList.add('image');
      const keyIndex = buttonContainer?.children.length === 2
        ? i + 1
        : i;
      generateKeyBoardResponseMap(keyIndex, i);
    });


    // update the trial number
    taskStore.transact('trialNumSubtask', (oldVal: number) => oldVal + 1);
    // update total real trials
    if (!isPractice(stim.notes)) {
      taskStore.transact('trialNumTotal', (oldVal: number) => oldVal + 1);
    }
  }

  setupReplayAudio(audioSource, stim.audioFile);
}

function doOnFinish(data: any, task: string) {
  if (audioSource) audioSource.stop();

  // note: nextStimulus is actually the current stimulus
  const stimulus = taskStore().nextStimulus;
  // target is the actual value as a string
  const target = taskStore().target;
  let responseValue = null

  // Record correct response
  if (stimulus.trialType !== 'instructions') {
    if (data.keyboard_response) {
      data.correct = keyboardResponseMap[data.keyboard_response] === target;
      responseValue = keyboardResponseMap[data.keyboard_response];
    } else {
      data.correct = data.button_response === taskStore().correctResponseIdx;
      responseValue = taskStore().choices[data.button_response];
    }

    // check response and record it
    const responseType = data.button_response ? 'mouse' : 'keyboard';

    // update running score and answer lists
    if (data.correct) {
      if (!isPractice(stimulus.notes)) {
        // practice trials don't count toward total
        taskStore.transact('totalCorrect', (oldVal: number) => oldVal + 1);
        taskStore('numIncorrect', 0); // reset incorrect trial count
      }
      practiceResponses = [];
      currPracticeChoiceMix = [];
      currPracticeAnswerIdx = null;
    } else {
      // Only increase incorrect trials if response is incorrect not a practice trial
      if (!isPractice(stimulus.notes)) {
        taskStore.transact('numIncorrect', (oldVal: number) => oldVal + 1);
      }

      practiceResponses.push(responseValue);
    }
    const trialData = buildTrialData(stimulus, target, responseType, responseValue, data);
    jsPsych.data.addDataToLastTrial(trialData);
  } else {
    // instructions
    taskStore('numIncorrect', 0); // reset incorrect trial count
    jsPsych.data.addDataToLastTrial({
      // false because it's not a real trial
      correct: false,
    });
  }

  if ((taskStore().numIncorrect >= taskStore().maxIncorrect)) {
    finishExperiment();
  }
}

// { trialType, responseAllowed, promptAboveButtons, task }
export const afcStimulusTemplate = (trialType: string, responseAllowed: boolean, promptAboveButtons: boolean, task: string) => {
  return {
    type: jsPsychAudioMultiResponse,
    response_allowed_while_playing: responseAllowed,
    data: () => {
      return {
        // not camelCase because firekit
        save_trial: true,
        // In order for ROAR to write computed scores to the run doc in the correct format,
        // assessment_stage must be explicitly "test_response" or "practice_response"
        assessment_stage: taskStore().isRoarApp ? 'test_response' : taskStore().nextStimulus.task,
        // not for firekit
        isPracticeTrial: taskStore().nextStimulus.notes === 'practice',
      };
    },
    stimulus: () => getStimulus(),
    prompt: () => {
      const prompt = getPrompt();
      return prompt;
    },
    prompt_above_buttons: promptAboveButtons,
    keyboard_choices: () => {
      return taskStore().nextStimulus.distractors?.length === 1
        ? ['ArrowLeft', 'ArrowRight']
        : ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    },
    button_choices: () => getButtonChoices(),
    button_html: () => getButtonHtml(),
    on_load: () => doOnLoad(),
    on_finish: (data: any) => doOnFinish(data, task),
    response_ends_trial: () => (taskStore().nextStimulus.notes === 'practice' ? false : true),
  };
};

