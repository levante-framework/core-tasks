import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
// @ts-ignore
import { taskStore } from '../../shared/helpers';

// Switch to HTMLMultiResponse when we have video with audio
export const videoInstructionsFit = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => mediaAssets.audio.mentalRotationTrainingInstruct3,
  prompt: () => {
    return `
      <div class="lev-stimulus-container">
        <video class="instruction-video" autoplay>
          <source src=${mediaAssets.video.mentalRotationExampleFit} type="video/mp4"/>
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  },
  prompt_above_buttons: true,
  button_choices: ['Continue'],
  button_html: () => {
    const t = taskStore().translations;
    return `<button class="primary">${t.continueButtonText}</button>`;
  },
  keyboard_choices: 'NO_KEYS',
  trial_ends_after_audio: false,
  response_allowed_while_playing: false,
  on_load: () => {
    // const wrapper = document.getElementById('jspsych-audio-multi-response-prompt');
    // wrapper.style.display = 'flex';
    // wrapper.style.justifyContent = 'center';
  },
};

export const videoInstructionsMisfit = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => mediaAssets.audio.mentalRotationTrainingInstruct2,
  prompt: () => {
    return `
      <div class="lev-stimulus-container">
        <video class="instruction-video" autoplay>
          <source src=${mediaAssets.video.mentalRotationExampleMisfit} type="video/mp4"/>
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  },
  prompt_above_buttons: true,
  button_choices: ['Continue'],
  button_html: () => {
    const t = taskStore().translations;
    return `<button class="primary">${t.continueButtonText}</button>`;
  },
  keyboard_choices: 'NO_KEYS',
  trial_ends_after_audio: false,
  response_allowed_while_playing: false,
};

export const imageInstructions = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    return {
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => mediaAssets.audio.mentalRotationInstruct1,
  prompt: () => {
    return `
      <div class="lev-stimulus-container">
        <img src=${mediaAssets.images.mentalRotationExample} class="instruction-video" />
      </div>
    `;
  },
  prompt_above_buttons: true,
  button_choices: ['Continue'],
  button_html: () => {
    const t = taskStore().translations;
    return `<button class="primary">${t.continueButtonText}</button>`;
  },
  keyboard_choices: 'NO_KEYS',
  trial_ends_after_audio: false,
  response_allowed_while_playing: false,
};
