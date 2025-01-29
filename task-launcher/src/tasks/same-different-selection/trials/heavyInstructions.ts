import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
//@ts-ignore
import { PageStateHandler, replayButtonSvg, setupReplayAudio, PageAudioHandler, camelize } from '../../shared/helpers';
//@ts-ignore
import { jsPsych } from '../../taskSetup';
import { taskStore } from '../../../taskStore';

function enableOkBtn() {
    const okButton: HTMLButtonElement | null = document.querySelector('.primary'); 
    if (okButton != null) {
      okButton.disabled = false;
    }
  }

const replayButtonHtmlId = 'replay-btn-revisited';

export const somethingSameDemo1 = {
    type: jsPsychHtmlMultiResponse,
    data: () => {
      return {
        assessment_stage: "instructions",
      };
    },
    stimulus: () => {
      const prompt = "sameDifferentSelectionBothYellowHeavy";
      const t = taskStore().translations;
      return (
        `<div class="lev-stimulus-container">
          <button
              id="${replayButtonHtmlId}"
              class="replay"
          >
              ${replayButtonSvg}
          </button>
          <div class="lev-row-container instruction">
            <p>${t[prompt]}</p>
          </div>
            <div class='lev-stim-content' style="flex-direction: column;">
                <div style="visibility: hidden";>
                  <button class='image-medium no-pointer-events'>
                    <img 
                      src=${mediaAssets.images[camelize("med-red-square")]}
                      alt=med-red-square
                      class=top-image
                    />
                  </button>
                </div>
              <div class='lev-response-row multi-4'>
                ${["sm-yellow-square", "lg-yellow-circle"].map(shape => {
                  return `<button class='image-medium no-pointer-events' style='margin: 0 4px'>
                            <img 
                              src=${mediaAssets.images[camelize(shape)]} 
                              alt=${shape} 
                            />
                        </button>`}
                ).join('')}
              </div>
            </div>
        </div>`
      )
    },
    prompt_above_buttons: true,
    button_choices: ['OK'],
    button_html: () => {
      return `<button disabled class='primary'>OK</button>`;
    },
    response_ends_trial: true,
    post_trial_gap: 350,
    on_load: () => {
      const audioFile = "sameDifferentSelectionBothYellowHeavy";
      PageAudioHandler.playAudio(mediaAssets.audio[audioFile], enableOkBtn);
  
      const pageStateHandler = new PageStateHandler(audioFile, true);
      setupReplayAudio(pageStateHandler);
      const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup') as HTMLDivElement;
      buttonContainer.classList.add('lev-response-row');
      buttonContainer.classList.add('multi-4');
    },
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();
  
      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses
      });
    }
}

export const somethingSameDemo2 = {
    type: jsPsychHtmlMultiResponse,
    data: () => {
      return {
        assessment_stage: "instructions",
      };
    },
    stimulus: () => {
      const prompt = "sdsPrompt3DemoHeavy";
      const t = taskStore().translations;
      return (
        `<div class="lev-stimulus-container">
          <button
              id="${replayButtonHtmlId}"
              class="replay"
          >
              ${replayButtonSvg}
          </button>
          <div class="lev-row-container instruction">
            <p>${t[prompt]}</p>
          </div>
            <div class='lev-stim-content' style="flex-direction: column;">
                <div>
                  <button class='image-medium no-pointer-events'>
                    <img 
                      src=${mediaAssets.images[camelize("med-red-square")]}
                      alt="med-red-square"
                      class='top-image'
                    />
                  </button>
                </div>
              <div class='lev-response-row multi-4'>
                ${["sm-yellow-square", "lg-yellow-circle"].map(shape => {
                  return `<button class='image-medium no-pointer-events' style='margin: 0 4px'>
                            <img 
                              src=${mediaAssets.images[camelize(shape)]} 
                              alt=${shape} 
                            />
                        </button>`}
                ).join('')}
              </div>
            </div>
        </div>`
      )
    },
    prompt_above_buttons: true,
    button_choices: ['OK'],
    button_html: () => {
      return `<button class='primary' disabled>OK</button>`;
    },
    response_ends_trial: true,
    post_trial_gap: 350,
    on_load: () => {
      const audioFile = "sdsPrompt3DemoHeavy";
      PageAudioHandler.playAudio(mediaAssets.audio[audioFile], enableOkBtn);
  
      const pageStateHandler = new PageStateHandler(audioFile, true);
      setupReplayAudio(pageStateHandler);
      const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup') as HTMLDivElement;
      buttonContainer.classList.add('lev-response-row');
      buttonContainer.classList.add('multi-4');

      const images = document.getElementsByTagName('img')
      const topImage = images[0];
      const bottomImages = [images[1], images[2]];

      // add button highlighting
      for (const button of bottomImages) {
        button.classList.add(
            'lev-staggered-responses',
            'lev-staggered-disabled',
            'lev-staggered-grayscale',
            'lev-staggered-opacity',
        );
      }

      setTimeout(() => {
        for (const button of bottomImages) {
            button.classList.remove(
                'lev-staggered-responses',
                'lev-staggered-disabled',
                'lev-staggered-grayscale',
                'lev-staggered-opacity',
            );
          }
        topImage.classList.add(
            'lev-staggered-responses',
            'lev-staggered-disabled',
            'lev-staggered-grayscale',
            'lev-staggered-opacity',
        )
      }, 
      3000
      )
    },
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();
  
      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses
      });
    }
  };

const videoInstructionData = [
  {
    prompt: "sds-pick-square-demo-heavy",
    video: "somethingSameDemo"
  },
  {
    prompt: "sds-match-demo1-heavy",
    video: "sdsMatchDemo1"
  },
  {
    prompt: "sds-match-demo2-heavy",
    video: "sdsMatchDemo2"
  }
]

const videoInstructions = videoInstructionData.map(data => {
  return {
    type: jsPsychHtmlMultiResponse,
    data: () => {
      return {
        assessment_stage: 'instructions',
      };
    },
    stimulus: () => {
        const t = taskStore().translations; 
      return `
        <div class="lev-stimulus-container">
          <button id="${replayButtonHtmlId}" class="replay">
            ${replayButtonSvg}
          </button>
          <div class="lev-row-container instruction">
            <p>${t[camelize(data.prompt)]}</p>
          </div>
          <video class="instruction-video" autoplay loop>
            <source src=${mediaAssets.video[data.video]} type="video/mp4"/>
            Your browser does not support the video tag.
          </video>
        </div>
      `;
    },
    prompt_above_buttons: true,
    post_trial_gap: 350,
    button_choices: ['Continue'],
    button_html: () => {
      const t = taskStore().translations;
      return `<button class="primary" disabled>${t.continueButtonText}</button>`;
    },
    keyboard_choices: 'NO_KEYS',
    on_load: () => {
      PageAudioHandler.playAudio(mediaAssets.audio[camelize(data.prompt)], enableOkBtn);
      
      const pageStateHandler = new PageStateHandler(data.prompt, true);
      setupReplayAudio(pageStateHandler);
    },
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();
  
      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses
      });
    }
  }
})

export const matchDemo2 = videoInstructions.pop(); 
export const matchDemo1 = videoInstructions.pop();
export const somethingSameDemo3 = videoInstructions.pop();

