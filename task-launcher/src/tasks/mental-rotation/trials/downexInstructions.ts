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
                item: ['target', 'distractor'],
                animation: 'pulse',
            }
        ]
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
                item: ['stim-image'],
                animation: 'drag',
            }
        ]
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
                item: ['stim-image'],
                animation: 'drag',
            }
        ]
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
            console.log(stimImage);
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

      const secondAudioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: false,
          maxRepetitions: 1,
        },
        onEnded: () => {
          enableOkBtn();
        }
      }

      const firstAudioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: false,
          maxRepetitions: 2,
        },
        onEnded: () => {
          // trigger the second animation (or the only animation)
          if (data.animations.length > 1) {
            animate(data.animations[1].animation, data.animations[1].item, data.animations[0].item);
          } else {
            animate(data.animations[0].animation, data.animations[0].item);
          }

          PageAudioHandler.playAudio(mediaAssets.audio[camelize(data.audio[1])] || mediaAssets.audio.inputAudioCue, secondAudioConfig);
        }  
      }

      
      // play the first audio
      PageAudioHandler.playAudio(mediaAssets.audio[camelize(data.audio[0])] || mediaAssets.audio.inputAudioCue, firstAudioConfig);

      // if there are two animations, start the first animation while the first audio is playing
      if (data.animations.length > 1) {
        animate(data.animations[0].animation, data.animations[0].item);
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
});