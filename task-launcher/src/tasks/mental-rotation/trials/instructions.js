import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';

export const instructions1 = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    const t = store.session.get('translations');
    return (`
    <div class='instructions-container'>
        <h1 class='instructions-title'>${t.instructions}</h1>

        <p>
            ${t.mentalRotationAdultInstructions1}
        </p>

        <footer>${t.generalFooter}</footer>
    </div>`)
  },
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: () => {
    const t = store.session.get('translations');
    return (`<button id="continue-btn">${t.continueButtonText}</button>`)
  },
  // trial_duration: 1000,
};

// Switch to HTMLMultiResponse when we have video with audio
export const videoInstructions = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => mediaAssets.audio.mentalRotationTrainingInstruct3,
  prompt: () => {
    return `<video id='instruction-video' autoplay>
        <source src=${mediaAssets.video.mentalRotationExample} type="video/mp4"/>
        Your browser does not support the video tag.
      </video>`;
  },
  prompt_above_buttons: true,
  button_choices: ['Continue'],
  button_html: () => {
    const t = store.session.get('translations');
    return (`<button id="continue-btn">${t.continueButtonText}</button>`)
  },
  keyboard_choices: 'ALL_KEYS',
  trial_ends_after_audio: false,
  response_allowed_while_playing: false,
  on_load: () => {
    const wrapper = document.getElementById('jspsych-audio-multi-response-prompt');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
  },
};


{
  /* <p>This will include addition, subtraction, and multiplication.</p>
        <p>Your job is to get through as many questions as you can in the given time.</p>

        <p>Click the button below or press <b>ANY KEY</b> to continue</p> */
}

// <p>In this task, you will be asked different questions about math.
//    This will include addition, subtraction, and multiplication.
//    Your job is to get through as many questions as you can in the given time.
//    Click the button below or press <b>ANY KEY</b> to continue
// </p>
