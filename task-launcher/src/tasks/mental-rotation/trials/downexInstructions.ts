import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from "../../..";
import { taskStore } from "../../../taskStore";
import { camelize, PageAudioHandler, PageStateHandler, replayButtonSvg, setupReplayAudio } from "../../shared/helpers";
import { animate } from "../helpers/animate";
import { jsPsych } from "../../taskSetup";

const replayButtonHtmlId = 'replay-btn-revisited';

const downexData = [
    {
        audio: [
            'mental-rotation-instruct1-part1-downex',
            'mental-rotation-instruct1-part2-downex',
        ],
        choices: [
            'Rp-000-silh',
            'Rn-000-silh',
        ],
        image: 'Rp-000-gray',
        animations: [
            {
                item: ['stim-image'],
                animation: 'pulse',
            }
        ], 
        eventOrder: ['audio', 'animation', 'audio']
    }, 
    {
        audio: [
            'mental-rotation-instruct2-downex',
            'mental-rotation-instruct3-downex',
        ],
        choices: [
            'Rp-000-silh',
            'Rn-000-silh',
        ],
        image: 'Rp-000-gray',
        animations: [
            {
                item: ['distractor'],
                animation: 'pulse',
            },
            {
                item: ['distractor'],
                animation: 'drag',
            }
        ], 
        eventOrder: ['audio', 'animation', 'animation', 'audio']
    },
    {
        audio: [
            'mental-rotation-instruct2-downex',
            'mental-rotation-instruct4-downex',
        ],
        choices: [
            'Rp-000-silh',
            'Rn-000-silh',
        ],
        image: 'Rp-000-gray',
        animations: [
            {
                item: ['target'],
                animation: 'pulse',
            },
            {
                item: ['target'],
                animation: 'drag',
            }
        ], 
        eventOrder: ['audio', 'animation', 'animation', 'audio']
    }
]

let startTime: number;

function enableOkBtn() {
    const okButton: HTMLButtonElement | null = document.querySelector('.primary');
    if (okButton != null) {
      okButton.disabled = false;
    }
  }

export const downexInstructions = downexData.map((data: any) => {
    return {    
        type: jsPsychHtmlMultiResponse,
        stimulus: () => {
            const t = taskStore().translations;
            const stimImage = mediaAssets.images[camelize(data.image)];
            const itemText = data.audio.map((file: string) => t[camelize(file)]).join(' ');
            
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

                  <div id="stim-container" class="lev-stim-content"">
                    <img
                        id="stim-image"
                        src=${stimImage}
                        alt="Image not loading: ${data.image}. Please continue the task."
                    />
                  </div>

                  <div id="choices-container" class="lev-response-row multi-4" style="gap: 16px; margin-top: 16px">
                    <button id="target" class="image-large no-pointer-events" disabled>
                      <img src=${mediaAssets.images[camelize(data.choices[0])]} alt=${data.choices[0]} />
                    </button>
                    <button id="distractor" class="image-large no-pointer-events" disabled>
                      <img src=${mediaAssets.images[camelize(data.choices[1])]} alt=${data.choices[1]} />
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

      // Preserve stim-container height before animation
      const stimContainer = document.getElementById('stim-container');
      const stimImage = document.getElementById('stim-image');
      if (stimContainer && stimImage) {
        const imageHeight = stimImage.offsetHeight;
        stimContainer.style.minHeight = `${imageHeight}px`;
      }

      // set up replay audio
      const trialAudio = data.audio;
      const pageStateHandler = new PageStateHandler(trialAudio, true);
      setupReplayAudio(pageStateHandler);

      const audioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: false,
          maxRepetitions: 2,
        },
        onEnded: () => {
          triggerNextEvent();
        }
      };

      function triggerNextEvent() {
        console.log('triggerNextEvent', data.eventOrder);
        if (data.eventOrder.length === 0) {
          enableOkBtn();
          return;
        }

        const event = data.eventOrder.shift();
        if (event === 'audio') {
          PageAudioHandler.playAudio(mediaAssets.audio[camelize(data.audio.shift())], audioConfig);
        } else if (event === 'animation') {
          const animationObject = data.animations.shift();
          console.log('animationObject', animationObject);
          animate(animationObject.animation, animationObject.item);
          setTimeout(() => {
            triggerNextEvent();
          }, 2000);
        }
      }

      triggerNextEvent();

    }, 
    on_finish: () => {
      PageAudioHandler.stopAndDisconnectNode();

      jsPsych.data.addDataToLastTrial({
        audioButtonPresses: PageAudioHandler.replayPresses,
        assessment_stage: 'instructions',
      });
    },
  } 
});