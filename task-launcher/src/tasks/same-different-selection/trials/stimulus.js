import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';
import { jsPsych } from '../../taskSetup';
import { dashToCamelCase, prepareChoices } from '../../shared/helpers';
export const stimulus = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {};
  },
  stimulus: () => {
    const stimulus = store.session.get('nextStimulus');
    const file = dashToCamelCase(stimulus.audioFile.replace(',', '-'));
    console.log(file);
    return mediaAssets.audio[file] || mediaAssets.audio['circle'];
  },
  prompt: () => {
    const stim = store.session('nextStimulus');
    let html = `<div id='stimulus-container'>
          <h1 id='prompt'>${stim.item}</h1>
          <div >`;
    if (stim.image != '') {
      let img =
        mediaAssets.images[dashToCamelCase(stim.image)] ||
        `https://imgs.search.brave.com/wH6NX0ADUKmdx5h4d9Tho1WEpa3NBj2USMxzllhYDFc/rs:fit:860:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAxLzk1LzcwLzUw/LzM2MF9GXzE5NTcw/NTAxM19NcW5YZFIx/dUV4dW5xazJjSldm/Z2hZbXE3ZTBwbmJz/ei5qcGc`;

      html = html + `<img id='stimulus-img' src=` + img + ` alt='stimulus' />`;
    }
    html =
      html +
      `</div>
        </div>
        `;
    return html;
  },
  prompt_above_buttons: true,
  button_choices: () => {
    const stim = store.session.get('nextStimulus');
    if (stim.trialType == 'something-same-2') {
      return store.session.get('choices');
    }
    let foo = prepareChoices(stim.answer, stim.distractors);
    return foo.choices;
  },
  button_html: () => {
    let choices = store.session.get('choices');
    let all_buttons = choices.map((choice, ind) => {
      console.log(choice);
      var img =
        mediaAssets.images[dashToCamelCase(choice)] ||
        `https://imgs.search.brave.com/wH6NX0ADUKmdx5h4d9Tho1WEpa3NBj2USMxzllhYDFc/rs:fit:860:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAxLzk1LzcwLzUw/LzM2MF9GXzE5NTcw/NTAxM19NcW5YZFIx/dUV4dW5xazJjSldm/Z2hZbXE3ZTBwbmJz/ei5qcGc`;
      var html = "<button class='img-btn'> <img src=" + img + " alt='shape' /> </button>";

      return html;
    });
    return all_buttons;
  },
  on_load: function () {
    let stim = store.session('nextStimulus');
    if (stim.trialType == 'something-same-1') {
      const jsPsychContent = document.getElementById('jspsych-content');
      const continueButton = document.createElement('button');
      continueButton.id = 'continue-btn';
      continueButton.textContent = 'OK';
      //TODO we would really like to disable the buttons
      continueButton.addEventListener('click', () => {
        //TODO we would really like to kill the audio here
        jsPsych.finishTrial();
      });

      jsPsychContent.appendChild(continueButton);
    }
  },
  on_finish: (data) => {},
};
