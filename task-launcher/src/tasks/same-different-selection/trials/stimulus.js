import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';

export const stimulus = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {};
  },
  stimulus: () => {
    const stimulus = store.session.get('nextStimulus');
    console.log(stimulus.audioFile);
    const file = stimulus.audioFile.split(',')[0];
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
        mediaAssets.images[stim.image] ||
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
  trial_ends_after_audio: () => {
    const stim = store.session('nextStimulus');
    if (stim.trialType == 'something-same-1') {
      return true;
    }
    return false;
  },
  response_allowed_while_playing: () => {
    const stim = store.session('nextStimulus');
    if (stim.trialType == 'something-same-1') {
      return false;
    }
    return true;
  },
  button_choices: () => {
    //console.log(store.session('nextStimulus').distractors);
    return store.session('nextStimulus').distractors;
  },
  button_html: () => {
    let choices = store.session('nextStimulus').distractors;
    //console.log(choices);
    let all_buttons = choices.map((choice, ind) => {
      var img =
        mediaAssets.images[choice] ||
        `https://imgs.search.brave.com/wH6NX0ADUKmdx5h4d9Tho1WEpa3NBj2USMxzllhYDFc/rs:fit:860:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAxLzk1LzcwLzUw/LzM2MF9GXzE5NTcw/NTAxM19NcW5YZFIx/dUV4dW5xazJjSldm/Z2hZbXE3ZTBwbmJz/ei5qcGc`;
      var html = "<button class='img-btn'> <img src=" + img + " alt='shape' /> </button>";
      return html;
    });
    return all_buttons;
  },
  /*button_html: () => {
    const options = store.session('nextStimulus').distractors;
    console.log(store.session('nextStimulus'));
    return options.map((i) => {
      `<button class='img-btn'>` +
        i +
        //<img src=${mediaAssets.images[i] ||} alt='shape' />
        `</button>`;
    });
  },*/
  on_load: () => {
    //console.log(store.session('nextStimulus'));
  },
  on_finish: (data) => {},
};
