import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import { PageStateHandler, PageAudioHandler, replayButtonSvg, setupReplayAudio, camelize } from '../../shared/helpers';
import { jsPsych } from '../../taskSetup';
import { taskStore } from '../../../taskStore';
import { matrixDragAnimation, triggerAnimation } from '../helpers/animateImages';

let startTime: number;

export const instructionData = [
  {
    prompt: 'matrixReasoningInstruct1',
    image: 'matrixExample', // GIF?
    buttonText: 'continueButtonText',
  },
];
const replayButtonHtmlId = 'replay-btn-revisited';

export const instructions = instructionData.map((data) => {
  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const t = taskStore().translations;
      const imageSrc = mediaAssets.images[data.image];
      return `<div class="lev-stimulus-container">
                        <button
                            id="${replayButtonHtmlId}"
                            class="replay"
                        >
                            ${replayButtonSvg}
                        </button>
                        <div class="lev-row-container instruction-small">
                            <p>${t[data.prompt]}</p>
                        </div>

                 
                        <img
                            src=${imageSrc}
                            alt="Image not loading: ${imageSrc}. Please continue the task."
                        />
                    </div>`;
    },
    prompt_above_buttons: true,
    button_choices: ['Next'],
    button_html: () => {
      const t = taskStore().translations;
      return [
        `<button class="primary">
                ${t[data.buttonText]}
            </button>`,
      ];
    },
    keyboard_choices: () => 'NO_KEYS',
    on_load: () => {
      PageAudioHandler.playAudio(mediaAssets.audio[data.prompt]);

      const pageStateHandler = new PageStateHandler(data.prompt, true);
      setupReplayAudio(pageStateHandler);
    },
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
    },
  };
});

const downexData = {
  audio: [
    'matrix-reasoning-instruct1-part1-downex',
    'matrix-reasoning-instruct1-part2-downex',
    'matrix-reasoning-instruct1-part3-downex',
    'matrix-reasoning-instruct1-part4-downex'
  ],
  choices: [
    'orange-square',
    'blue-circle',
    'green-star',
    'black-triangle',
  ],
  image: 'downexItem1',
}

function enableOkBtn() {
  const okButton: HTMLButtonElement | null = document.querySelector('.primary');
  if (okButton != null) {
    okButton.disabled = false;
  }
}

export const downexInstructions = {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const t = taskStore().translations;
      const stimImage = mediaAssets.images[downexData.image];
       
      const itemText = downexData.audio.map((file: string) => t[camelize(file)]).join(' ');
            

      return `<div class="lev-stimulus-container">
                  <button
                      id="${replayButtonHtmlId}"
                      class="replay"
                  >
                      ${replayButtonSvg}
                  </button>
                  <div class="lev-row-container instruction-small">
                      <p>${itemText}</p>
                  </div>

                  <div id="stim-container" class="lev-stim-content-x-2">
                    <img
                        src=${stimImage}
                        alt="Image not loading: ${stimImage}. Please continue the task."
                    />
                  </div>

                  <div id="choices-container" class="lev-response-row multi-4" style="gap: 16px; margin-top: 16px">
                    <button id="target" class="image no-pointer-events" disabled>
                      <img src=${mediaAssets.images[camelize(downexData.choices[0])]} alt=${downexData.choices[0]} />
                    </button>
                    <button class="image no-pointer-events" disabled>
                      <img src=${mediaAssets.images[camelize(downexData.choices[1])]} alt=${downexData.choices[1]} />
                    </button>
                    <button class="image no-pointer-events" disabled>
                      <img src=${mediaAssets.images[camelize(downexData.choices[2])]} alt=${downexData.choices[2]} />
                    </button>
                    <button class="image no-pointer-events" disabled>
                      <img src=${mediaAssets.images[camelize(downexData.choices[3])]} alt=${downexData.choices[3]} />
                    </button>
                  </div>
              </div>`;
    },
    prompt_above_buttons: true,
    button_choices: ['Next'],
    button_html: () => {
      const t = taskStore().translations;
      return [
        `<button class="primary" disabled>${t.continueButtonText}</button>`,
      ];
    },
    keyboard_choices: () => 'NO_KEYS',
    on_load: async () => {
      startTime = performance.now();

      // set up replay audio
      const trialAudio = downexData.audio;
      const pageStateHandler = new PageStateHandler(trialAudio, true);
      setupReplayAudio(pageStateHandler);

      const stimContainer = document.getElementById('stim-container');
      const stimImage = stimContainer?.querySelector('img');
      const buttonContainer = document.getElementById('choices-container');
      const buttons = Array.from(buttonContainer?.querySelectorAll('button') || []); 
      const target = document.getElementById('target');

      // set up animations
      let itemsToAnimate = [target, buttons, stimImage];

      const audioConfig: AudioConfigType = {
          restrictRepetition: {
            enabled: false,
            maxRepetitions: 2,
          }
        }
  
      for (const [index, audioFile] of trialAudio.slice(0, -1).entries()) {
        const audioUri = mediaAssets.audio[camelize(audioFile)] || mediaAssets.audio.nullAudio;
        const repetitions = index === 2 ? 1 : 2;

        await new Promise<void>((resolve) => {
            const configWithCallback = {
              ...audioConfig,
              onEnded: () => {
                itemsToAnimate = triggerAnimation(itemsToAnimate, `pulse 2s 0s ${repetitions}`) as any;
                setTimeout(() => resolve(), 3000);
              }
            };
            PageAudioHandler.playAudio(audioUri, configWithCallback);
        });
      }

      const lastAudioUri = mediaAssets.audio[camelize(trialAudio[trialAudio.length - 1])] || mediaAssets.audio.nullAudio;

      // animate the target button to the center of stimImage
      if (stimImage && target) {
        matrixDragAnimation(stimImage, target);

        const lastAudioConfig: AudioConfigType = {
          restrictRepetition: {
            enabled: false,
            maxRepetitions: 1,
          },
          onEnded: () => {
            enableOkBtn();
          }
        };

        setTimeout(() => PageAudioHandler.playAudio(lastAudioUri, lastAudioConfig), 3000);
      }
    },
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
    },
}
