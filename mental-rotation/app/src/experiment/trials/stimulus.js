// import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import jsPsychHTMLMultiResponse from "@jspsych-contrib/plugin-html-multi-response"
import store from "store2";
import { jsPsych } from "../jsPsych";
import { updateProgressBar, addItemToSortedStoreList, } from "../helperFunctions";
import { mediaAssets } from "../experimentSetup";
import { isPractice } from "./subTask";
import { prepareChoices } from "../helperFunctions";

export const audioContext = new Audio();


export const stimulus = {
    type: jsPsychHTMLMultiResponse,
    response_allowed_while_playing: true,
    data: () => {
      return {
        // save_trial and assessment_stage are for firekit
        save_trial: true,
        assessment_stage: store.session.get("nextStimulus").subtask,
        is_practice_trial: store.session.get("nextStimulus").source === 'EGMA-practice'
      }
    },
    stimulus: () => mediaAssets.images.nullAudio,
    // prompt: () => {
    //   return (`
    //     <div>
    //       <p id="prompt">${ store.session.get("nextStimulus").prompt }</p>
    //       <br>
    //       <p id="stimulus">${ store.session.get("nextStimulus").item }</p>
    //     </div>`
    //   )
    // },
    prompt_above_buttons: true,
    button_choices: () => {
      const stimulus = store.session.get("nextStimulus");
      const { target, distractors } = stimulus;

      const trialInfo = prepareChoices(target, distractors);

      return trialInfo.choices;

      // return [1,2,3,4]
    },
    button_html: () => "<button>%choice%</button>",
    on_load: () => {
      const {  buttonLayout, keyHelpers } = store.session.get("config");
      const distractors = store.session.get("nextStimulus").distractors
      
      // replace this selector with whatever multi-response type trial you are using
      const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup')

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
        decorated: nextStimulus.decorated,
        distractor1: nextStimulus.distractor1,
        distractor2: nextStimulus.distractor2,
        distractor3: nextStimulus.distractor3,
        response: store.session("responseValue"),
        responseNum: data.button_response,
        correctResponseIndx: store.session("correctResponseIndx"),
        correct: data.correct,
        replay: store.session("ifReplay"),
      });

      // reset the replay button
      store.session.set("ifReplay", 0);

      if (!isPractice(subTaskName)) {
        updateProgressBar();
      }
    }
};