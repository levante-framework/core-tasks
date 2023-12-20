import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import store from "store2";
import { jsPsych } from "../../taskSetup";
import { prepareChoices, updateProgressBar, addItemToSortedStoreList, isPractice } from "../../shared/helpers";
import { mediaAssets } from "../../..";
import { audioResponse } from "./audioFeedback";
import _toNumber from 'lodash/toNumber'

export const audioContext = new Audio();

let source, keyboardResponseMap = {}

export const afcStimulus = {
    type: jsPsychAudioMultiResponse,
    response_allowed_while_playing: true,
    data: () => {
      return {
        // not camelCase because firekit
        save_trial: true,
        assessment_stage: store.session.get("nextStimulus").task,
        // not for firekit
        isPracticeTrial: store.session.get("nextStimulus").notes === 'practice'
      }
    },
    stimulus: () => {
      const stim = store.session.get("nextStimulus")
      if (stim.task === 'Number Identification') {
        // For testing, in case audio isnt defined
        return mediaAssets.audio[stim.item] || mediaAssets.audio.nullAudio
      } else {
        return mediaAssets.audio.nullAudio
      }
    },
    prompt: () => `
    <div id='stimulus-container'>
      ${store.session.get("nextStimulus").task === 'Number Identification' ? `<img src=${mediaAssets.images.speakerIcon} id='replay-btn' alt='speaker replay icon'/>` : ''}
      <p id="prompt">${ store.session.get("nextStimulus").prompt }</p>
      <br>
      <p id="stimulus-html">${ store.session.get("nextStimulus").item }</p>
    </div>`,
    prompt_above_buttons: true,
    keyboard_choices: ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
    button_choices: () => {
      const stimulus = store.session.get("nextStimulus");
      const { answer, distractors } = stimulus;

      const trialInfo = prepareChoices(answer, distractors);

      store.session.set("target", answer);
      store.session.set("choices", trialInfo.choices);

      return trialInfo.choices;
    },
    button_html: () => "<button class='math-btn'>%choice%</button>",
    on_load: () => {
      const stim = store.session.get("nextStimulus") 
      const { buttonLayout, keyHelpers} = store.session.get("config")
      const buttonContainer = document.getElementById("jspsych-audio-multi-response-btngroup")
      buttonContainer.classList.add(`${buttonLayout}-layout`);

      const arrowKeyEmojis = [
        ['arrowup', '↑'], 
        ['arrowleft', '←'], 
        ['arrowright', '→'], 
        ['arrowdown', '↓']
      ]
      
      const responseChoices = store.session('choices')

      Array.from(buttonContainer.children).forEach((el, i) => {
        // Add condition on triple for length (2)
        if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
          el.classList.add(`button${i + 1}`)
        }

        // Map arrow to response choice.
        keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i] 

        if (keyHelpers) { 
          // Margin on the actual button element
          el.children[0].style.marginBottom = '.5rem'

          const arrowKeyBorder = document.createElement('div')
          arrowKeyBorder.classList.add('arrow-key-border')

          const arrowKey = document.createElement('p')
          arrowKey.textContent = arrowKeyEmojis[i][1]
          arrowKey.style.textAlign = 'center'
          arrowKey.style.fontSize = '1.5rem'
          arrowKey.style.margin = '0'
          // arrowKey.classList.add('arrow-key')
          arrowKeyBorder.appendChild(arrowKey)
          el.appendChild(arrowKeyBorder)
        }
      })

      // update the trial number
      store.session.transact("trialNumSubtask", (oldVal) => oldVal + 1);
      // update total real trials
      if (!isPractice(stim.notes)) {
        store.session.transact("trialNumTotal", (oldVal) => oldVal + 1);
      }

      if (store.session.get("nextStimulus").task === 'Number Identification') {
        const replayBtn = document.getElementById('replay-btn');

        async function replayAudio() {
          const jsPsychAudioCtx = jsPsych.pluginAPI.audioContext();
  
          // Returns a promise of the AudioBuffer of the preloaded file path.
          const audioBuffer = await jsPsych.pluginAPI.getAudioBuffer(mediaAssets.audio[stim.item]);
  
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
      const stimulus = store.session("nextStimulus");
      const choices = store.session("choices");
      const target = store.session('target')
      
    
      if (data.keyboard_response) {
        data.correct = keyboardResponseMap[data.keyboard_response] === target
        store.session.set("responseValue", keyboardResponseMap[data.keyboard_response]);
      } else {
        data.correct = data.button_response === store.session('correctResponseIdx')
        store.session.set("responseValue", choices[data.button_response]);
      }

      // check response and record it
      store.session.set("correct", data.correct);
      store.session.set("responseType", data.button_response ? 'mouse' : 'keyboard');

      // update running score and answer lists
      if (data.correct) {
        if (!isPractice(stimulus.notes)) {
          // practice trials don't count toward total
          store.session.transact("totalCorrect", (oldVal) => oldVal + 1);
        }
      } else {
        addItemToSortedStoreList("incorrectItems", target);
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
        response: store.session("responseValue"),
        responseType: store.session('responseType'),
      });

      if (!isPractice(stimulus.notes)) {
        updateProgressBar();
      }
  }
}

export const ifRealTrialResponse = {
  timeline: [audioResponse],

  conditional_function: () => {
    const subTask = store.session.get("nextStimulus").notes;
    if (isPractice(subTask)) {
      return false;
    }
    return true;
  },
};