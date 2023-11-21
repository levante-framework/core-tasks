import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import store from "store2";
import { mediaAssets } from "../experimentSetup";
import "../i18n";
import { isPractice } from "./subTask";
import { storyByLabel } from "./storySupport";

export const practiceIncorrectFeedback = {
  type: jsPsychAudioMultiResponse,
  response_allowed_while_playing: false,
  stimulus: () => mediaAssets.audio.nullAudio,
  prompt: () => `
  <div>
    <p class="item-stimulus">${ store.session.get("nextStimulus").prompt }</p>
    <br>
    <p class="item-stimulus">${ store.session.get("nextStimulus").item }</p>
  </div>`,
  prompt_above_buttons: true,
  trial_ends_after_audio: false,
  trial_duration: 500000,
  button_choices: () => store.session.get("choices"), 
  on_load: () => {
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
  },
  button_html: () => `<button class="feedback-btn">%choice%</button>`,
};

export const ifPracticeCorrect = {
  timeline: () => [storyByLabel.practiceCorrect],
  conditional_function: () => {
    // doesn't apply to real trials
    const subTaskName = store.session("subTaskName");
    if (!isPractice(subTaskName)) {
      return false;
    }

    // check for correct response
    if (store.session.get("correct") === 1) {
      return true;
    }
    return false;
  },
};

export const ifPracticeIncorrect = {
  timeline: [practiceIncorrectFeedback],
  conditional_function: () => {
    // doesn't apply to real trials
    const subTaskName = store.session("subTaskName");
    if (!isPractice(subTaskName)) {
      return false;
    }

    // check for correct response
    if (store.session.get("correct") === 0) {
      return true;
    }
    return false;
  },
};
