import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import store from "store2";
import { mediaAssets } from "../experimentSetup";
import "../i18n";

export const practiceFeedbackTrial = {
  type: jsPsychAudioMultiResponse,
  response_allowed_while_playing: false,
  stimulus: () => store.session.get("correct") === 1 ?  mediaAssets.audio.thatsRight : mediaAssets.audio.tryAgain,
  prompt: () => {
    const isPreviousCorrect = store.session.get("correct") === 1
    if (!isPreviousCorrect) {
      return (
        `<div>
          <p id="prompt">${ store.session.get("nextStimulus").prompt }</p>
          <br>
          <p id="stimulus">${ store.session.get("nextStimulus").item }</p>
        </div>`
      )
    } else {
      return (
        `<div class="prompt-container">
          <h1 class="prompt-header"> That's right!</h1>
          <img class="task-graphic" src=${mediaAssets.images.rOARLion} alt="Roar Lion"/>
        </div>`
      )
    }
  },
  prompt_above_buttons: true,
  trial_ends_after_audio: false,
  trial_duration: () => store.session.get("correct") === 1 ? 1000 : 500000,
  button_choices: () => store.session.get("correct") === 1 ? [] : store.session.get("choices"), 
  on_load: () => {
    if (store.session.get("correct") !== 1) {
      const btnOption = store.session.get("config").buttonLayout;
      document
        .getElementById("jspsych-audio-multi-response-btngroup")
        .classList.add(`${btnOption}-layout`);
  
      const target = store.session.get("target");
  
      const buttons = document.querySelectorAll(".feedback-btn");
  
      buttons.forEach((button) => {
        if (button.textContent.trim() === target) {
          button.classList.add("glowingButton");
        } else {
          button.parentElement.classList.add("disabled-btn");
        }
      });
    }
  },
  button_html: () => `<button class="feedback-btn">%choice%</button>`,
};

export const practiceFeedback = {
  timeline: [ practiceFeedbackTrial ],
  conditional_function: () => store.session.get("nextStimulus").source === 'EGMA-practice'
}

