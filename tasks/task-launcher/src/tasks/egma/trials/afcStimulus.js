import jsPsychAudioMultiResponse from "@jspsych-contrib/plugin-audio-multi-response";
import store from "store2";
import { jsPsych } from "../../taskSetup";
import { prepareChoices, updateProgressBar, addItemToSortedStoreList, isPractice } from "../../shared/helpers";
import { mediaAssets } from "../../..";
import { audioResponse } from "./audioFeedback";

export const audioContext = new Audio();

let source

export const afcStimulus = {
    type: jsPsychAudioMultiResponse,
    response_allowed_while_playing: true,
    data: () => {
      return {
        // not camelCase because firekit
        // save_trial: true,
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
      <p id="stimulus">${ store.session.get("nextStimulus").item }</p>
    </div>`,
    prompt_above_buttons: true,
    button_choices: () => {
      // Experiment logic should not be happening in trial parameters
      const stimulus = store.session.get("nextStimulus");
      const { answer, distractors } = stimulus;

      const trialInfo = prepareChoices(answer, distractors);

      store.session.set("target", answer);
      store.session.set("correctResponseNum", trialInfo.correctResponseNum);
      // console.log('trialInfo choices: ', trialInfo.choices)
      store.session.set("choices", trialInfo.choices);

      return trialInfo.choices;
    },
    button_html: () => "<button>%choice%</button>",
    on_load: () => {
      const stim = store.session.get("nextStimulus") 
      const btnOption = store.session.get("config").buttonLayout;
      document.getElementById("jspsych-audio-multi-response-btngroup").classList.add(`${btnOption}-layout`);

      // update the trial number
      store.session.transact("trialNumSubtask", (oldVal) => oldVal + 1);
      // update total real trials
      const subTaskName = store.session("subTaskName");
      if (!isPractice(subTaskName)) {
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
      const nextStimulus = store.session("nextStimulus");
      const choices = store.session("choices");

      const subTaskName = store.session("subTaskName");

      // check response and record it
      data.correct = data.button_response === store.session("correctResponseNum") ? true : false;
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

      // update adaptive algorithm
      // cat.updateAbilityEstimate({a: 1, b: nextStimulus.difficulty, c: 0.25, d: 1}, store.session('response'));
      // console.log(cat.theta);
      // console.log(cat.thetaSE);

      // cat2.updateAbilityEstimate({a: 1, b: nextStimulus.difficulty, c: 0.5, d: 1}, store.session('response'));

      jsPsych.data.addDataToLastTrial({
        // specific to this trial
        item: nextStimulus.item,
        assessment_stage: data.assessment_stage,
        answer: store.session("target"),
        choices: choices,
        distractors: nextStimulus.distractors,
        response: store.session("responseValue"),
        responseNum: data.button_response,
        correctResponseNum: store.session("correctResponseNum"),
        correct: data.correct,
      });

      if (!isPractice(subTaskName)) {
        updateProgressBar();
      }
  }
}

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