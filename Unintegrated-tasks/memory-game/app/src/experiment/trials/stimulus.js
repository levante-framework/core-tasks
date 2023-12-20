import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import store from "store2";
import { jsPsych } from "../jsPsych";
import {
  shuffle,
  updateProgressBar,
  addItemToSortedStoreList,
} from "../helperFunctions";
import { mediaAssets } from "../experimentSetup";
import { isPractice } from "./subTask";
import { audioResponse } from "./audioFeedback";

export const audioContext = new Audio();

const prepareChoices = (target, distractors) => {
  // randomly select a location for the correct answer
  const randIndex = Math.floor(Math.random() * distractors.length + 1);

  // randomize the order of the distractors
  const stimulus = shuffle(distractors);
  let choices = [];
  for (let i = 0; i < distractors.length; i++) {
    choices.push(stimulus[i]);
  }

  // insert the target
  choices.splice(randIndex, 0, target);

  return {
    target: target,
    choices: choices,
    correctResponseNum: randIndex,
  };
};

// these fields are used by jsPsych to determine whether or not computedScoreCallback is called
const trialDataParams = [
  {
    data: {
      save_trial: true,
      assessment_stage: "practice_response", // tag the practice trials we can filter data later
    },
  },
  {
    data: {
      save_trial: true,
      assessment_stage: "test_response", // tag the test trials  so we can filter data later
    },
  },
];

const trialsMapped = trialDataParams.map((trial, i) => {
  return {
    type: jsPsychAudioMultiResponse,
    response_allowed_while_playing: true,
    data: () => trial.data,
    stimulus: () => mediaAssets.audio.nullAudio,
    prompt: () => `
    <div>
      <p class="item-stimulus">${ store.session.get("nextStimulus").prompt }</p>
      <br>
      <p class="item-stimulus">${ store.session.get("nextStimulus").item }</p>
    </div>`,
    prompt_above_buttons: true,
    button_choices: () => {
      const stimulus = store.session.get("nextStimulus");
      const { target, distractors } = stimulus;

      const trialInfo = prepareChoices(target, distractors);

      store.session.set("target", target);
      store.session.set("correctResponseNum", trialInfo.correctResponseNum);
      store.session.set("choices", trialInfo.choices);

      return trialInfo.choices;
    },
    button_html: () => "<button>%choice%</button>",
    on_load: () => {
      const btnOption = store.session.get("config").buttonLayout;
      document.getElementById("jspsych-audio-multi-response-btngroup").classList.add(`${btnOption}-layout`);

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
      data.correct = data.button_response === store.session("correctResponseNum") ? 1 : 0;
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
        correctResponseNum: store.session("correctResponseNum"),
        correct: data.correct,
        replay: store.session("ifReplay"),
      });

      // reset the replay button
      store.session.set("ifReplay", 0);

      if (!isPractice(subTaskName)) {
        updateProgressBar();
      }

    },
  };
});

export const [practiceTrials, stimulusTrials] = trialsMapped;

export const ifRealTrialResponse = {
  timeline: [audioResponse],

  conditional_function: () => {
    // doesn't apply to practice trials
    const subTaskName = store.session("subTaskName");
    if (isPractice(subTaskName)) {
      return false;
    }
    return true;
  },
};
