import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response"
import store from "store2";
import { jsPsych } from "../../taskSetup";
import { 
    updateProgressBar,
    addItemToSortedStoreList,
    isPractice,
    prepareChoices
} from "../../shared/helpers";
import { mediaAssets } from "../../..";
import _toNumber from 'lodash/toNumber'

let keyboardResponseMap = {}


export const stimulus = {
    type: jsPsychHTMLMultiResponse,
    data: () => {
      return {}
    },
    stimulus: () => {
      return (`
        <div id='stimulus-container'>
          <p id="prompt">Choose the best pattern to fill in the blank.</p>
          <br>
          <img id="stimulus-img" src=${ mediaAssets.images[store.session.get('nextStimulus').item] }  alt=${ store.session.get('nextStimulus').item }/>
        </div>`
      )
    },
    keyboard_choices: ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'],
    button_choices: () => {
      const stimulus = store.session.get("nextStimulus");
      const { answer, distractors } = stimulus;

      const trialInfo = prepareChoices(answer, distractors);

      // for image buttons
      return trialInfo.choices.map((choice, i) => `<img src=${mediaAssets.images[choice]} alt=${choice} />`)
    },
    button_html: () => `<button>%choice%</button>`,
    on_load: () => {
      const {  buttonLayout, keyHelpers } = store.session.get("config");
      
      // replace this selector with whatever multi-response type trial you are using
      const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup')

      const arrowKeyEmojis = [
        ['arrowup', '↑'], 
        ['arrowleft', '←'], 
        ['arrowright', '→'], 
        ['arrowdown', '↓']
      ]

      const responseChoices = store.session('choices')

      Array.from(buttonContainer.children).forEach((el, i) => {
        if (buttonContainer.children.length === 2) {
          el.classList.add(`two-afc`)
        }
        // Add condition on triple for length (2)
        if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
          el.classList.add(`button${i + 1}`)
        }

        keyboardResponseMap[arrowKeyEmojis[i][0]] = responseChoices[i] 

        el.children[0].classList.add('img-btn')

        if (keyHelpers) { 
          // Margin on the actual button element
          el.children[0].style.marginBottom = '1rem'

          const arrowKeyBorder = document.createElement('div')
          arrowKeyBorder.classList.add('arrow-key-border')

          const arrowKey = document.createElement('p')
          arrowKey.innerHTML = arrowKeyEmojis[i][1]
          arrowKey.style.textAlign = 'center'
          arrowKey.style.margin = '0'

          arrowKeyBorder.appendChild(arrowKey)
          el.appendChild(arrowKeyBorder)
        }
      })

      buttonContainer.classList.add(`${buttonLayout}-layout`);

      // update the trial number
      store.session.transact("trialNumSubtask", (oldVal) => oldVal + 1);
      // update total real trials
      const subTaskName = store.session("subTaskName");
      if (!isPractice(subTaskName)) {
        store.session.transact("trialNumTotal", (oldVal) => oldVal + 1);
      }
    },
    on_finish: (data) => {
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

      jsPsych.data.addDataToLastTrial({
        item: _toNumber(stimulus.item) || stimulus.item,
        answer: target,
        distractors: stimulus.distractors,
        response: store.session("responseValue"),
        responseType: store.session('responseType'),
      });

      console.log('data: ', jsPsych.data.get().last(1).values()[0])


      if (!isPractice(stimulus.notes)) {
        updateProgressBar();
      }
    }
};