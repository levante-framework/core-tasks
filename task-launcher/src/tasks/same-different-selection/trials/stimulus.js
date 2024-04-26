import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';
import { dashToCamelCase } from '../../shared/helpers';
export const stimulus = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {};
  },
  stimulus: () => {
    const stimulus = store.session.get('nextStimulus');
    console.log(stimulus.audioFile);
    const file = dashToCamelCase(stimulus.audioFile.split(',')[0]);
    console.log(file);
    console.log(mediaAssets.audio);
    return mediaAssets.audio[file] || mediaAssets.audio['sdsPrompt1'];
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
    //console.log(store.session('nextStimulus').distractors);
    return store.session('nextStimulus').distractors;
  },
  button_html: () => {
    let choices = store.session('nextStimulus').distractors;
    //console.log(choices);
    let all_buttons = choices.map((choice, ind) => {
      var img =
        mediaAssets.images[dashToCamelCase(choice)] ||
        `https://imgs.search.brave.com/wH6NX0ADUKmdx5h4d9Tho1WEpa3NBj2USMxzllhYDFc/rs:fit:860:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAxLzk1LzcwLzUw/LzM2MF9GXzE5NTcw/NTAxM19NcW5YZFIx/dUV4dW5xazJjSldm/Z2hZbXE3ZTBwbmJz/ei5qcGc`;
      var disable = store.session('nextStimulus').trialType == 'something-same-1' ? 'disabled' : '';
      console.log(disable);
      var html = "<button class='img-btn'" + disable + '> <img src=' + img + " alt='shape' /> </button>";

      return html;
    });
    return all_buttons;
  },
  on_load: () => {
    //console.log(store.session('nextStimulus'));
    let stim = store.session('nextStimulus');
    console.log('trialType!!!');
    console.log(stim.trialType);
    if (stim.trialType == 'something-same-1') {
      const jsPsychContent = document.getElementById('jspsych-content');
      const continueButton = document.createElement('button');
      continueButton.id = 'continue-btn';
      continueButton.textContent = 'OK';

      continueButton.addEventListener('click', () => {
        jsPsych.finishTrial();
      });

      jsPsychContent.appendChild(continueButton);
    }
  },
  on_finish: (data) => {},
};
