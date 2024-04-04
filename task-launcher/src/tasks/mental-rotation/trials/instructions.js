import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';

export const instructions1 = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>Instructions</h1>

        <p>
            In this task, you will be shown a series of images (e.g., a rabbit), and asked which of two silhouettes (outlines) the image matches, if it were rotated (*not* flipped).
            Please try to answer accurately, but also quickly. Thank you for your participation!
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to continue</footer>
    </div>`,
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Continue</button>',
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
  button_html: '<button id="continue-btn" class="jspsych-btn">%choice%</button>',
  keyboard_choices: 'ALL_KEYS',
  trial_ends_after_audio: false,
  response_allowed_while_playing: false,
  on_load: () => {
    const wrapper = document.getElementById('jspsych-audio-multi-response-prompt');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
  },
};

export const taskFinished = {
  type: jsPsychHTMLMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: `
    <div class='instructions-container'>
        <h1 class='instructions-title'>You've completed the task -- thank you!</h1>

        <p>
            <a href="https://app.prolific.com/submissions/complete?cc=CO28HI56">Click here</a> to return to Prolific (completion code: CO28HI56).
        </p>

        <footer>Click the button below or press <b>ANY KEY</b> to exit</footer>
    </div>`,
  button_choices: [`Continue`],
  keyboard_choices: 'ALL_KEYS',
  button_html: '<button id="continue-btn">Exit</button>',
  // trial_duration: 1000,
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
