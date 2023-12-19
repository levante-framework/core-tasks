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
          <img id="stimulus" src=${ mediaAssets.images[store.session.get('nextStimulus').item] }  alt=${ store.session.get('nextStimulus').item }/>
        </div>`
      )
    },
    button_choices: () => {
      const stimulus = store.session.get("nextStimulus");
      const { answer, distractors } = stimulus;

      const trialInfo = prepareChoices(answer, distractors);

      return trialInfo.choices;
    },
    button_html: () => `<button>%choice%</button>`,
    on_load: () => {
        console.log('nextStimulus', store.session.get('nextStimulus'))

      const {  buttonLayout, keyHelpers } = store.session.get("config");
      
      // replace this selector with whatever multi-response type trial you are using
      const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup')

      const arrowKeyEmojis = ['↑', '←', '→', '↓']

      // special case for 3 buttons - add thier respective positions in the grid
      // if (distractors.length === 2) {
        Array.from(buttonContainer.children).forEach((el, i) => {
          // Add condition on triple for length (2)
          if (buttonLayout === 'triple' || buttonLayout === 'diamond') {
            el.classList.add(`button${i + 1}`)
          }

          if (keyHelpers) { 
            // Margin on the actual button element
            el.children[0].style.marginBottom = '1rem'

            const arrowKeyBorder = document.createElement('div')
            arrowKeyBorder.classList.add('arrow-key-border')
  
            const arrowKey = document.createElement('p')
            arrowKey.textContent = arrowKeyEmojis[i]
            arrowKey.style.textAlign = 'center'
            arrowKey.style.fontSize = '1.5rem'
            arrowKey.style.margin = '0'
            // arrowKey.classList.add('arrow-key')
            arrowKeyBorder.appendChild(arrowKey)
            el.appendChild(arrowKeyBorder)
          }
        })
      // }

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
      const nextStimulus = store.session("nextStimulus");
      const choices = store.session("choices");

      const subTaskName = store.session("subTaskName");

      // check response and record it
      data.correct = data.button_response === store.session("correctResponseIndx") ? 1 : 0;
      store.session.set("correct", data.correct);
      store.session.set("response", data.button_response);
      store.session.set("responseValue", choices[data.button_response]);

      // update running score and answer lists
      if (data.correct === 1) {
        if (!isPractice(subTaskName)) {
          // practice trials don't count toward total
          store.session.transact("totalCorrect", (oldVal) => oldVal + 1);
        }
      } else {
        addItemToSortedStoreList("incorrectItems", store.session("target"));
      }

      jsPsych.data.addDataToLastTrial({
        // specific to this trial
        item: nextStimulus.item,
        assessment_stage: data.assessment_stage,
        target: store.session("target"),
        choices: store.session("choices"),
        response: store.session("responseValue"),
        responseNum: data.button_response,
        correctResponseIndx: store.session("correctResponseIndx"),
      });


      if (!isPractice(subTaskName)) {
        updateProgressBar();
      }
    }
};