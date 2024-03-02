import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import { prepareChoices, updateProgressBar, addItemToSortedStoreList, isPractice } from '../../shared/helpers';
import { mediaAssets } from '../../..';
import { audioResponse } from './audioFeedback';
import _toNumber from 'lodash/toNumber';

export const audioContext = new Audio();

let source,
  keyboardResponseMap = {};

export const afcStimulus = {
  type: jsPsychAudioMultiResponse,
  response_allowed_while_playing: true,
  data: () => {
    return {
      // not camelCase because firekit
      save_trial: true,
      assessment_stage: store.session.get('nextStimulus').task,
      // not for firekit
      isPracticeTrial: store.session.get('nextStimulus').notes === 'practice',
    };
  },
  stimulus: () => {
    const stim = store.session.get('nextStimulus');
    if (stim.trialType === 'Number Identification') {
      // For testing, in case audio isnt defined
      return mediaAssets.audio[camelize(stim.audioFile)] || mediaAssets.audio.nullAudio;
    } else {
      return mediaAssets.audio.nullAudio;
    }
  },
  prompt: () => {
    const stim = store.session.get('nextStimulus');
    return `<div id='stimulus-container'>
          ${
            stim.trialType === 'Number Identification'
              ? `<img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>`
              : ''
          }
          <p id="prompt">${stim.prompt}</p>
          <br>
          <p id="stimulus-html" style="${stim.trialType === 'Number Identification' ? 'color: transparent;' : ''}">${
            stim.item
          }</p>
        </div>`;
  },
  prompt_above_buttons: true,
  keyboard_choices: ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
  button_choices: () => {
    const stimulus = store.session.get('nextStimulus');
    const { answer, distractors } = stimulus;

    const trialInfo = prepareChoices(answer, distractors);

    store.session.set('target', answer);
    store.session.set('choices', trialInfo.choices);

    return trialInfo.choices;
  },
  button_html: () => "<button class='math-btn'>%choice%</button>",
  on_load: () => {
    const stim = store.session.get('nextStimulus');
    const { buttonLayout, keyHelpers } = store.session.get('config');
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup');
    buttonContainer.classList.add(`${buttonLayout}-layout`);

    // const arrowKeyEmojis = [
    //   ['arrowup', '↑'],
    //   ['arrowleft', '←'],
    //   ['arrowright', '→'],
    //   ['arrowdown', '↓']
    // ]

    const arrowKeyEmojis = [
      [
        'arrowup',
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M41.7238 27.1414L43.8051 25.0602C44.6863 24.1789 44.6863 22.7539 43.8051 21.882L25.5895 3.65703C24.7082 2.77578 23.2832 2.77578 22.4113 3.65703L4.18633 21.882C3.30508 22.7633 3.30508 24.1883 4.18633 25.0602L6.26758 27.1414C7.1582 28.032 8.61133 28.0133 9.4832 27.1039L20.2457 15.807L20.2457 42.7508C20.2457 43.9977 21.2488 45.0008 22.4957 45.0008H25.4957C26.7426 45.0008 27.7457 43.9977 27.7457 42.7508L27.7457 15.807L38.5082 27.1039C39.3801 28.0227 40.8332 28.0414 41.7238 27.1414Z" fill="#A0BBFF"/>
        </svg>
        `,
      ],
      [
        'arrowleft',
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M27.1414 41.7277L25.0602 43.809C24.1789 44.6902 22.7539 44.6902 21.882 43.809L3.65703 25.5934C2.77578 24.7121 2.77578 23.2871 3.65703 22.4152L21.882 4.19023C22.7633 3.30898 24.1883 3.30898 25.0602 4.19023L27.1414 6.27148C28.032 7.16211 28.0133 8.61523 27.1039 9.48711L15.807 20.2496H42.7508C43.9977 20.2496 45.0008 21.2527 45.0008 22.4996V25.4996C45.0008 26.7465 43.9977 27.7496 42.7508 27.7496H15.807L27.1039 38.5121C28.0227 39.384 28.0414 40.8371 27.1414 41.7277Z" fill="#A0BBFF"/>
        </svg>`,
      ],
      [
        'arrowright',
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M20.8586 6.27227L22.9398 4.19102C23.8211 3.30977 25.2461 3.30977 26.118 4.19102L44.343 22.4066C45.2242 23.2879 45.2242 24.7129 44.343 25.5848L26.118 43.8098C25.2367 44.691 23.8117 44.691 22.9398 43.8098L20.8586 41.7285C19.968 40.8379 19.9867 39.3848 20.8961 38.5129L32.193 27.7504H5.24921C4.00234 27.7504 2.99921 26.7473 2.99921 25.5004V22.5004C2.99921 21.2535 4.00234 20.2504 5.24921 20.2504H32.193L20.8961 9.48789C19.9773 8.61602 19.9586 7.16289 20.8586 6.27227Z" fill="#A0BBFF"/>
        </svg>`,
      ],
      [
        'arrowdown',
        `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M41.7238 20.8586L43.8051 22.9398C44.6863 23.8211 44.6863 25.2461 43.8051 26.118L25.5895 44.343C24.7082 45.2242 23.2832 45.2242 22.4113 44.343L4.18633 26.118C3.30508 25.2367 3.30508 23.8117 4.18633 22.9398L6.26758 20.8586C7.1582 19.968 8.61133 19.9867 9.4832 20.8961L20.2457 32.193L20.2457 5.24921C20.2457 4.00234 21.2488 2.99921 22.4957 2.99921H25.4957C26.7426 2.99921 27.7457 4.00234 27.7457 5.24921L27.7457 32.193L38.5082 20.8961C39.3801 19.9773 40.8332 19.9586 41.7238 20.8586Z" fill="#A0BBFF"/>
        </svg>`,
      ],
    ];

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
        keyboardResponseMap[arrowKeyEmojis[i + 1][0]] = responseChoices[i];
      } else {
        keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i];
      }

      if (keyHelpers) {
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

    if (store.session.get('nextStimulus').trialType === 'Number Identification') {
      const replayBtn = document.getElementById('replay-btn');

      async function replayAudio() {
        const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();

        // Returns a promise of the AudioBuffer of the preloaded file path.
        const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(mediaAssets.audio[camelize(stim.audioFile)]);

        source = jsPsychAudioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(jsPsychAudioCtx.destination);
        source.start(0);
      }

      replayBtn.addEventListener('click', replayAudio);
    }
  },
  on_finish: (data) => {
    if (source) source.stop();

    // note: nextStimulus is actually the current stimulus
    const stimulus = store.session('nextStimulus');
    const choices = store.session('choices');
    const target = store.session('target');

    if (data.keyboard_response) {
      data.correct = keyboardResponseMap[data.keyboard_response] === target;
      store.session.set('responseValue', keyboardResponseMap[data.keyboard_response]);
    } else {
      data.correct = data.button_response === store.session('correctResponseIdx');
      store.session.set('responseValue', choices[data.button_response]);
    }

    // check response and record it
    store.session.set('correct', data.correct);
    store.session.set('responseType', data.button_response ? 'mouse' : 'keyboard');

    // update running score and answer lists
    if (data.correct) {
      if (!isPractice(stimulus.notes)) {
        // practice trials don't count toward total
        store.session.transact('totalCorrect', (oldVal) => oldVal + 1);
      }
    } else {
      addItemToSortedStoreList('incorrectItems', target);
    }

    // update adaptive algorithm
    // cat.updateAbilityEstimate({a: 1, b: nextStimulus.difficulty, c: 0.25, d: 1}, store.session('response'));
    // console.log(cat.theta);
    // console.log(cat.thetaSE);

    // cat2.updateAbilityEstimate({a: 1, b: nextStimulus.difficulty, c: 0.5, d: 1}, store.session('response'));

    jsPsych.data.addDataToLastTrial({
      // specific to this trial
      item: _toNumber(stimulus.item) || stimulus.item,
      answer: target,
      distractors: stimulus.distractors,
      response: store.session('responseValue'),
      responseType: store.session('responseType'),
    });

    if (!isPractice(stimulus.notes)) {
      updateProgressBar();
    }
  },
};

export const ifRealTrialResponse = {
  timeline: [audioResponse],

  conditional_function: () => {
    const subTask = store.session.get('nextStimulus').notes;
    if (isPractice(subTask)) {
      return false;
    }
    return true;
  },
};
