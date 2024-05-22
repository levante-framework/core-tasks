// For all tasks except: H&F, Memory Game, Same Different Selection
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { jsPsych, isTouchScreen } from '../../taskSetup';
import {
  prepareChoices,
  addItemToSortedStoreList,
  isPractice,
  fractionToMathML,
  isMaxTimeoutReached,
  arrowKeyEmojis,
  replayButtonDiv,
  setupReplayAudio,
  setSkipCurrentBlock
} from '../../shared/helpers';
import { mediaAssets } from '../../..';
import _toNumber from 'lodash/toNumber';
import { camelize } from '@bdelab/roar-utils';
import { finishExperiment } from './';

// Previously chosen responses for current practice trial
let practiceResponses = [];
let currPracticeChoiceMix = [];
let currPracticeAnswerIdx;
let trialsOfCurrentType = 0;

let audioSource;
let keyboardResponseMap = {};
// Only used for keyboard responses
let startTime;
const incorrectPracticeResponses = [];

const playAudio = async (audioUri) => {
  const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();
  // Returns a promise of the AudioBuffer of the preloaded file path.
  const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(audioUri);
  const audioSource = jsPsychAudioCtx.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.connect(jsPsychAudioCtx.destination);
  audioSource.start(0);
};

const showStaggeredBtnAndPlaySound = (btn) => {
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

function getStimulus(trialType) {
  // ToDo: trialType (audio/html) no longer varies -- remove
  const stim = store.session.get('nextStimulus');
  if (!stim.audioFile) return mediaAssets.audio.nullAudio;
  if (!mediaAssets.audio[camelize(stim.audioFile)]) return mediaAssets.audio.nullAudio;
  // all tasks should have the replay button play whatever is in stim.audioFile (might be just prompt/instructions)

  if (stim.task === 'Mental Rotation' && stim.notes !== 'practice' && stim.trialType !== 'instructions') {
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

function getPrompt(task) {
  // showItem itemIsImage
  const stim = store.session.get('nextStimulus');
  const t = store.session.get('translations');

  let stimItem;
  if (stim.trialType === 'Fraction') {
    stimItem = fractionToMathML(stim.item);
  } else {
    stimItem = stim.item;
  }

  //if(stim.taskType === 'instructions' || stim.trialType === 'Number Identification' || stim.trialType === 'Number Comparison') showItem = false
  let showImageStim = false;
  if (stim.task === 'Mental Rotation' || stim.task === 'Matrix Reasoning') showImageStim = true;

  if (stim.trialType === 'instructions' || stim.task === 'instructions' || showImageStim) {
    if(!stimItem) stimItem = ''; // was undefined in vocab instruction trials
    return (
      `<div id='stimulus-container'>` +
      replayButtonDiv +
      `<div id="prompt-container-text">
                <p id="prompt">${t[camelize(stim.audioFile)]}</p>
            </div>

            ${
              stim.task === 'math' || stimItem === ''
                ? ''
                : `<img 
                id="stimulus-img" 
                src=${mediaAssets.images[camelize(stimItem)] || mediaAssets.images['blank']}
                alt=${stimItem || `Stimulus`}
                />`
            }
        </div>`
    );
  }

  // just audio - no text prompt/stimulus
  if (task === 'vocab' || task === 'trog' || stim.trialType === 'Number Identification' || stim.trialType === 'Number Comparison') {
    return `<div id='stimulus-container'>` + replayButtonDiv + `</div>`;
  }

  if (task === 'theory-of-mind') {
    return (
      `
        <div id='stimulus-container'>` +
      replayButtonDiv +
      `<img 
              id="stimulus-img" 
              src=${mediaAssets.images[camelize(stimItem)] || mediaAssets.images['blank']}
              alt=${stimItem || `Stimulus`}
            />
        </div>`
    );
  }

  if (stim.audioFile) {
    return (
      `<div id='stimulus-container'>` +
      replayButtonDiv + // || stim.item
      `<div id="prompt-container-text">
                    <p id="prompt">${t[camelize(stim.audioFile)]}</p>
                </div>
                <br>
                ${task === 'egma-math' ? `<p id="stimulus-html">${stimItem}</p>` : ``}
                
            </div>`
    );
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
  const stimulus = store.session.get('nextStimulus');
  if (stimulus.trialType === 'instructions') {
    return ['OK'];
  }

  const { answer, distractors } = stimulus;
  let trialInfo =
    stimulus.task === 'Mental Rotation'
      ? prepareChoices(answer, distractors, false)
      : prepareChoices(answer, distractors);

  // TODO: Don't think we need this since we set vars in prepareChoices
  store.session.set('target', answer);
  store.session.set('choices', trialInfo.choices);

  if (task === 'matrix-reasoning' && stimulus.notes === 'practice' && !currPracticeChoiceMix.length) {
    currPracticeChoiceMix = trialInfo.choices;
    currPracticeAnswerIdx = store.session.get('correctResponseIdx'); // Fixed: Use 'get' for consistency
  }

  if (stimulus.trialType === 'Fraction') {
    const mathMLChoices = [fractionToMathML(answer), ...distractors.map(fractionToMathML)];
    store.session.set('choices', mathMLChoices);
    return mathMLChoices;
  }

  if (
    ['vocab', 'trog', 'matrix-reasoning', 'mental-rotation', 'theory-of-mind'].includes(task) &&
    stimulus.trialType !== 'instructions'
  ) {
    return generateImageChoices(trialInfo.choices);
  }

  return trialInfo.choices; // Default return if no special conditions met
}

function getButtonHtml(task) {
  const stimulus = store.session.get('nextStimulus');
  // TODO: add trial_type column to math item bank
  if (stimulus.trialType === 'instructions') {
    return "<button id='continue-btn'>%choice%</button>";
  }
  if (stimulus.trialType === 'Fraction') {
    return "<button class='math-btn'>%choice%</button>";
  } else if (task === 'egma-math') {
    // practice-btn class does not add any styles, only used for querySelector
    return `<button class='math-btn ${stimulus.notes === 'practice' ? 'practice-btn' : ''}'>%choice%</button>`;
  } else {
    return `<button class='${stimulus.notes === 'practice' ? 'practice-btn' : ''}'>%choice%</button>`;
  }
}

function enableBtns(btnElements) {
  btnElements.forEach((btn) => (btn.disabled = false));
}

async function keyboardBtnFeedback(e, practiceBtns, stim) {
  let allowedKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

  if (stim.distractors.length === 1) {
    allowedKeys = ['ArrowLeft', 'ArrowRight'];
  }

  if (allowedKeys.includes(e.key)) {
    let feedbackAudio;
    const choice = keyboardResponseMap[e.key.toLowerCase()];
    // Find button with response text
    practiceBtns.forEach((btn) => {
      if (btn.children.length) {
        const btnOption = btn.children[0].alt;
        if (choice == btnOption) {
          if (choice == stim.answer) {
            btn.classList.add('practice-correct');
            feedbackAudio = mediaAssets.audio.feedbackGoodJob;
            setTimeout(
              () => jsPsych.finishTrial({ response: choice, incorrectPracticeResponses: incorrectPracticeResponses }),
              1000,
            );
          } else {
            btn.classList.add('practice-incorrect');
            feedbackAudio = mediaAssets.audio.feedbackTryAgain;
            setTimeout(() => enableBtns(practiceBtns), 500);
            incorrectPracticeResponses.push(choice);
          }
        }
      } else {
        const btnOption = btn.textContent;

        if (choice == btnOption) {
          if (choice == stim.answer) {
            btn.classList.add('practice-correct');
            feedbackAudio = mediaAssets.audio.feedbackGoodJob;
            setTimeout(
              () => jsPsych.finishTrial({ response: choice, incorrectPracticeResponses: incorrectPracticeResponses }),
              1000,
            );
          } else {
            btn.classList.add('practice-incorrect');
            feedbackAudio = mediaAssets.audio.feedbackTryAgain;
            setTimeout(() => enableBtns(practiceBtns), 500);
            incorrectPracticeResponses.push(choice);
          }
        }
      }
    });

    const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

    // Returns a promise of the AudioBuffer of the preloaded file path.
    const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(feedbackAudio);

    audioSource = jsPsychAudioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(jsPsychAudioCtx.destination);
    audioSource.start(0);
  }
}

let keyboardFeedbackHandler;

function doOnLoad(task) {
  startTime = performance.now();

  const stim = store.session.get('nextStimulus');
  if (task === 'theory-of-mind' && stim.trialType === 'audio_question') {
    const parentResponseDiv = document.getElementById('jspsych-audio-multi-response-btngroup');
    parentResponseDiv.style.display = 'none';
    let i = 0;
    const intialDelay = 4000;
    for (const jsResponseEl of parentResponseDiv.children) {
      jsResponseEl.style.display = 'none';
      setTimeout(() => showStaggeredBtnAndPlaySound(jsResponseEl), intialDelay + 2000 * i);
      i += 1;
    }
    parentResponseDiv.style.display = 'flex';
    parentResponseDiv.style.flexDirection = 'row';
  }
  const currentTrialIndex = jsPsych.getProgress().current_trial_global;
  let twoTrialsAgoIndex = currentTrialIndex - 2;
  if (stim.task === 'math') {
    twoTrialsAgoIndex = currentTrialIndex - 3; // math has a fixation or something
  }
  const twoTrialsAgoStimulus = jsPsych.data.get().filter({ trial_index: twoTrialsAgoIndex }).values();

  if (stim.notes === 'practice') {
    const practiceBtns = document.querySelectorAll('.practice-btn');
    let feedbackAudio;

    practiceBtns.forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        // assume img btn
        if (btn.children.length) {
          const choice = btn.children[0].alt;
          // Loose equality to handle number strings
          if (choice == stim.answer) {
            btn.classList.add('practice-correct');
            feedbackAudio = mediaAssets.audio.feedbackGoodJob;
            setTimeout(
              () => jsPsych.finishTrial({ response: choice, incorrectPracticeResponses: incorrectPracticeResponses }),
              1000,
            );
          } else {
            btn.classList.add('practice-incorrect');
            feedbackAudio = mediaAssets.audio.feedbackTryAgain;
            setTimeout(() => enableBtns(practiceBtns), 500);
            incorrectPracticeResponses.push(choice);
          }
        } else {
          const choice = btn.textContent;

          if (choice == stim.answer) {
            btn.classList.add('practice-correct');
            feedbackAudio = mediaAssets.audio.feedbackGoodJob;
            setTimeout(
              () => jsPsych.finishTrial({ response: choice, incorrectPracticeResponses: incorrectPracticeResponses }),
              1000,
            );
          } else {
            btn.classList.add('practice-incorrect');
            feedbackAudio = mediaAssets.audio.feedbackTryAgain;
            setTimeout(() => enableBtns(practiceBtns), 500);
            incorrectPracticeResponses.push(choice);
          }
        }

        const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

        // Returns a promise of the AudioBuffer of the preloaded file path.
        const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(feedbackAudio);

        audioSource = jsPsychAudioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(jsPsychAudioCtx.destination);
        audioSource.start(0);
      }),
    );

    if (!isTouchScreen) {
      function keyboardBtnFeedbackHandler(e) {
        keyboardBtnFeedback(e, practiceBtns, stim);
      }

      keyboardFeedbackHandler = keyboardBtnFeedbackHandler;

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
    if (stim.notes != 'practice' && stim.trialType != 'instructions') {
      trialsOfCurrentType += 1;
    }
  }

  if (stim.trialType !== 'instructions') {
    const { buttonLayout, keyHelpers } = store.session.get('config');

    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup');

    if (buttonLayout !== 'default' && buttonContainer.children.length === 2) {
      buttonContainer.classList.add('default-layout');
    } else {
      buttonContainer.classList.add(`${buttonLayout}-layout`);
    }

    const responseChoices = store.session('choices');

    Array.from(buttonContainer.children).forEach((el, i) => {
      if (buttonContainer.children.length === 2) {
        el.classList.add(`two-afc`);
      }

      // Add condition on triple for length (2)
      if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
        el.classList.add(`button${i + 1}`);
      }

      // Map arrow to response choice.
      // 2afc layout uses left and right arrow keys. The order of the arrrow
      // key array allows for the correct mapping for other layouts.
      if (buttonContainer.children.length === 2) {
        if (stim.notes === 'practice' && task === 'matrix-reasoning') {
          keyboardResponseMap[arrowKeyEmojis[i + 1][0]] = currPracticeChoiceMix[i];
        } else {
          keyboardResponseMap[arrowKeyEmojis[i + 1][0]] = responseChoices[i];
        }
      } else {
        if (stim.notes === 'practice' && task === 'matrix-reasoning') {
          keyboardResponseMap[arrowKeyEmojis[i][0]] = currPracticeChoiceMix[i];
        } else {
          keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i];
        }
      }

      if (task === 'matrix-reasoning' || task === 'theory-of-mind') {
        el.children[0].classList.add('img-btn');
      }

      if (task === 'trog' || task === 'vocab') {
        el.children[0].classList.add('trog-img-btn');
      } else if (task === 'mental-rotation') {
        el.children[0].classList.add('mental-rotation-img-btn');
        let img = document.getElementById('stimulus-img');
        img.style.width = '17vw';
        img.style.height = '17vw';
      }

      if (task === 'matrix-reasoning') {
        if (stim.notes === 'practice' && practiceResponses.length) {
          // feedback response (red X for wrong, green check for correct)
          // green check TBI
          practiceResponses.forEach((response) => {
            if (response === el.children[0].children[0].alt) {
              el.classList.add('response-feedback-container');
              el.children[0].classList.add('response-feedback');
              el.children[0].disabled = true;
            }
          });
        }
      }

      if (keyHelpers && !isTouchScreen) { // GK: add && !(buttonLayout === 'default') ? (exception: mental rotation)
        // Margin on the actual button element
        el.children[0].style.marginBottom = '.5rem';

        const arrowKeyBorder = document.createElement('div');
        arrowKeyBorder.classList.add('arrow-key-border');

        const arrowKey = document.createElement('p');
        if (buttonContainer.children.length === 2) {
          arrowKey.innerHTML = arrowKeyEmojis[i + 1][1];
        } else {
          arrowKey.innerHTML = arrowKeyEmojis[i][1];
        }
        arrowKey.style.textAlign = 'center';
        arrowKey.style.margin = '0';
        // arrowKey.classList.add('arrow-key')
        arrowKeyBorder.appendChild(arrowKey);
        el.appendChild(arrowKeyBorder);
      }
    });

    // update the trial number
    store.session.transact('trialNumSubtask', (oldVal) => oldVal + 1);
    // update total real trials
    if (!isPractice(stim.notes)) {
      store.session.transact('trialNumTotal', (oldVal) => oldVal + 1);
    }
  }

  setupReplayAudio(audioSource, stim.audioFile);
}

function doOnFinish(data, task) {
  if (audioSource) audioSource.stop();

  // note: nextStimulus is actually the current stimulus
  const stimulus = store.session('nextStimulus');
  // target is the actual value as a string
  const target = store.session('target');

  if (stimulus.trialType !== 'instructions') {
    if (data.keyboard_response) {
      data.correct = keyboardResponseMap[data.keyboard_response] === target;
      store.session.set('responseValue', keyboardResponseMap[data.keyboard_response]);
    } else {
      if (stimulus.notes === 'practice' && task === 'matrix-reasoning') {
        data.correct = data.button_response === currPracticeAnswerIdx;
        store.session.set('responseValue', currPracticeChoiceMix[data.button_response]);
      } else {
        data.correct = data.button_response === store.session('correctResponseIdx');
        store.session.set('responseValue', store.session('choices')[data.button_response]);
      }
    }

    // check response and record it
    store.session.set('correct', data.correct);
    store.session.set('responseType', data.button_response ? 'mouse' : 'keyboard');

    // update running score and answer lists
    if (data.correct) {
      if (!isPractice(stimulus.notes)) {
        // practice trials don't count toward total
        store.session.transact('totalCorrect', (oldVal) => oldVal + 1);
        store.session.set('incorrectTrials', 0); // reset incorrect trial count
      }
      practiceResponses = [];
      currPracticeChoiceMix = [];
      currPracticeAnswerIdx = null;
    } else {
      // Only increase incorrect trials if response is incorrect not a practice trial
      if (!isPractice(stimulus.notes)) {
        store.session.transact('incorrectTrials', (oldVal) => oldVal + 1);
      }
      addItemToSortedStoreList('incorrectItems', target);

      const pushedResponse = store.session.get('responseValue');
      practiceResponses.push(pushedResponse);
    }

    jsPsych.data.addDataToLastTrial({
      // specific to this trial
      item: _toNumber(stimulus.item) || stimulus.item,
      answer: target,
      distractors: stimulus.distractors,
      corpusTrialType: stimulus.trialType,
      responseType: store.session('responseType'),
    });

    // corpusId and itemId fields are used by ROAR but not ROAD
    if (store.session.get('config').storeItemId) {
      jsPsych.data.addDataToLastTrial({
        corpusId: store.session.get('config').corpus,
        itemId: stimulus.source + '-' + stimulus.origItemNum,
      });
    }

    // Adding this seperately or otherwise it will overide
    // the response value added from practice trials
    if (stimulus.notes !== 'practice') {
      jsPsych.data.addDataToLastTrial({
        response: store.session('responseValue'),
      });
    }

    // adding manually since trial does not log it properly
    // for keyboard responses
    if (data.responseType === 'keyboard' || data.response_source === 'keyboard') {
      const endTime = performance.now();
      const calculatedRt = Math.round(endTime - startTime);
      jsPsych.data.addDataToLastTrial({
        rt: calculatedRt,
      });
    }

    // remove listner or it will stack since were adding it on the document itself
    if (stimulus.notes === 'practice') {
      document.removeEventListener('keydown', keyboardFeedbackHandler);
    }
  } else {
    // instructions
    store.session.set('incorrectTrials', 0); // reset incorrect trial count
    jsPsych.data.addDataToLastTrial({
      // false because it's not a real trial
      correct: false,
    });
  }

  if (task === 'egma-math') {
    setSkipCurrentBlock(stimulus.trialType, finishExperiment);
  } else if ((store.session.get('incorrectTrials') >= store.session.get('config').maxIncorrect) || store.session.get('maxTimeReached')) {
    finishExperiment();
  }
}

// { trialType, responseAllowed, promptAboveButtons, task }
export const afcStimulusTemplate = ({ trialType, responseAllowed, promptAboveButtons, task } = {}) => {
  // TODO: pull out task-specific parameters (e.g., getPrompt(.., showPrompt=false) for Number Identification, TROG, ..)
  return {
    type: jsPsychAudioMultiResponse,
    response_allowed_while_playing: responseAllowed,
    data: () => {
      return {
        // not camelCase because firekit
        save_trial: true,
        // In order for ROAR to write computed scores to the run doc in the correct format,
        // assessment_stage must be explicitly "test_response" or "practice_response"
        assessment_stage: store.session.get('config').isRoarApp ? 'test_response' : store.session.get('nextStimulus').task,
        // not for firekit
        isPracticeTrial: store.session.get('nextStimulus').notes === 'practice',
      };
    },
    stimulus: () => getStimulus(trialType),
    prompt: () => getPrompt(task, trialType),
    prompt_above_buttons: promptAboveButtons,
    keyboard_choices: () => {
      return store.session.get('nextStimulus').distractors?.length === 1
        ? ['ArrowLeft', 'ArrowRight']
        : ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    },
    button_choices: () => getButtonChoices(task, trialType),
    button_html: () => getButtonHtml(task, trialType),
    on_load: () => doOnLoad(task, trialType),
    on_finish: (data) => doOnFinish(data, task, trialType),
    response_ends_trial: () => (store.session.get('nextStimulus').notes === 'practice' ? false : true),
  };
};

export const afcStimulus = ({ trialType, responseAllowed, promptAboveButtons, task } = {}) => {
  return {
    timeline: [
      afcStimulusTemplate({
        trialType: trialType,
        responseAllowed: responseAllowed,
        promptAboveButtons: promptAboveButtons,
        task: task,
      }),
    ],
    conditional_function: () => {
      // TO DO if isRoar game parameter is desired
      // const stim = store.session.get("nextStimulus")
      // if (stim.notes.startsWith("roar-") && !isRoar) {
      //     console.log("TO DO roar-only instructions start with roar- in notes field")
      // }

      // don't play when skipping trials because app is finished
      if (isMaxTimeoutReached()) {
        // timer cleanup
        if (store.session.get('maxTimerId')) {
          clearTimeout(store.session.get('maxTimerId'));
          store.session.set('maxTimerId', null);
        }
        return false;
      } else {
        return true;
      }
    },
  };
};
