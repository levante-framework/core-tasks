import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
// @ts-ignore
import { replayButtonSvg, PageStateHandler, PageAudioHandler, setupReplayAudio } from '../../shared/helpers';
// @ts-ignore
import { jsPsych } from '../../taskSetup';
import { taskStore } from '../../../taskStore';

const replayButtonHtmlId = 'replay-btn-revisited';

function enableOkBtn() {
  const okButton: HTMLButtonElement | null = document.querySelector('.primary'); 
  if (okButton != null) {
    okButton.disabled = false;
  }
}

// Switch to HTMLMultiResponse when we have video with audio
export const videoInstructionsFit = {
  type: jsPsychHtmlMultiResponse,
  data: () => {
    return {
      // save_trial: true,
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    return `
      <div class="lev-stimulus-container">
        <button id="${replayButtonHtmlId}" class="replay">
          ${replayButtonSvg}
        </button>
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
    return `<button class="primary" disabled>${t.continueButtonText}</button>`;
  },
  keyboard_choices: 'NO_KEYS',
  on_load: () => {
    // const wrapper = document.getElementById('jspsych-audio-multi-response-prompt');
    // wrapper.style.display = 'flex';
    // wrapper.style.justifyContent = 'center';
    PageAudioHandler.playAudio(mediaAssets.audio.mentalRotationTrainingInstruct3, enableOkBtn);
    
    const pageStateHandler = new PageStateHandler('mental-rotation-training-instruct3');
    setupReplayAudio(pageStateHandler);
  },
  on_finish: () => {
    PageAudioHandler.stopAndDisconnectNode();

    jsPsych.data.addDataToLastTrial({
      audioButtonPresses: PageAudioHandler.replayPresses
    });
  }
};

export const videoInstructionsMisfit = {
  type: jsPsychHtmlMultiResponse,
  data: () => {
    return {
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    return `
      <div class="lev-stimulus-container">
        <button id="${replayButtonHtmlId}" class="replay">
          ${replayButtonSvg}
        </button>
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
    return `<button class="primary" id="ok-button" disabled>${t.continueButtonText}</button>`;
  },
  keyboard_choices: 'NO_KEYS',
  on_load: () => {
    PageAudioHandler.playAudio(mediaAssets.audio.mentalRotationTrainingInstruct2, enableOkBtn); 
    
    const pageStateHandler = new PageStateHandler('mental-rotation-training-instruct2');
    setupReplayAudio(pageStateHandler);
},
on_finish: () => {
  PageAudioHandler.stopAndDisconnectNode();

  jsPsych.data.addDataToLastTrial({
    audioButtonPresses: PageAudioHandler.replayPresses
  });
}
};

export const imageInstructions = {
  type: jsPsychHtmlMultiResponse,
  data: () => {
    return {
      assessment_stage: 'instructions',
    };
  },
  stimulus: () => {
    return `
      <div class="lev-stimulus-container">
        <button id="${replayButtonHtmlId}" class="replay">
          ${replayButtonSvg}
        </button>
        <img src=${mediaAssets.images.mentalRotationExample} class="instruction-video" />
      </div>
    `;
  },
  prompt_above_buttons: true,
  button_choices: ['Continue'],
  button_html: () => {
    const t = taskStore().translations;
    return `<button class="primary" disabled>${t.continueButtonText}</button>`;
  },
  keyboard_choices: 'NO_KEYS',
  on_load: () => {
    PageAudioHandler.playAudio(mediaAssets.audio.mentalRotationInstruct1, enableOkBtn); 

    const pageStateHandler = new PageStateHandler('mental-rotation-instruct1');
    setupReplayAudio(pageStateHandler);
},
on_finish: () => {
  PageAudioHandler.stopAndDisconnectNode();

  jsPsych.data.addDataToLastTrial({
    audioButtonPresses: PageAudioHandler.replayPresses
  });
}
};
