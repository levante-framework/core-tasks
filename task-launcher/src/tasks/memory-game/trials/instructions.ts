import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { jsPsych } from '../../taskSetup';
import { mediaAssets } from '../../..';
import { PageStateHandler, PageAudioHandler, replayButtonSvg, setupReplayAudio } from '../../shared/helpers';
import { taskStore } from '../../../taskStore';

const instructionData = [
  // downex instructions
  {
    prompt: "memoryGameInstruct1", 
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  {
    prompt: "memoryGameInstruct2Downex", 
    image: 'catAvatar',
  },
  {
    prompt: "memoryGameInstruct4Downex", 
    image: 'catAvatar',
  },
  {
    prompt: "memoryGameInstruct6Downex", 
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  {
    prompt: "memoryGameInstruct10Downex", 
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  {
    prompt: "heartsAndFlowersEncourage2", 
    image: 'rocket@2x',
    buttonText: 'continueButtonText',
  },
  {
    prompt: "heartsAndFlowersPlayTime", 
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  // older kid instructions
  {
    prompt: 'memoryGameInstruct1',
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  {
    prompt: 'memoryGameInstruct2',
    image: 'highlightedBlock',
    buttonText: 'continueButtonText',
  },
  {
    prompt: 'memoryGameInstruct3',
    video: 'selectSequence',
    buttonText: 'continueButtonText',
  },
  {
    prompt: 'memoryGameInstruct4',
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  {
    prompt: 'memoryGameInstruct5',
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  {
    prompt: 'memoryGameInstruct6',
    image: 'catAvatar',
    buttonText: 'continueButtonText',
  },
  {
    prompt: 'memoryGameBackwardPrompt',
    video: 'selectSequenceReverse',
    buttonText: 'continueButtonText',
  },
];

const replayButtonHtmlId = 'replay-btn-revisited';

const instructions = instructionData.map((data) => {
  return {
    type: jsPsychHtmlMultiResponse,
    stimulus: () => {
      const t = taskStore().translations;
      const mediaSrc = data.video ? mediaAssets.video[data.video] : mediaAssets.images[data.image as string];
      return `<div class="lev-stimulus-container">
                        <button
                            id="${replayButtonHtmlId}"
                            class="replay"
                        >
                            ${replayButtonSvg}
                        </button>
                        <div class="lev-row-container instruction">
                            <p>${t[data.prompt]}</p>
                        </div>
                        <div class="lev-stim-content-x-3">
                            ${
                              data.video
                                ? `<video class='instruction-video-small' autoplay loop>
                                    <source src=${mediaSrc} type='video/mp4'>
                                </video>`
                                : `<img
                                    src=${mediaSrc}
                                    alt="Image not loading ${mediaSrc}. Please continue the task."
                                />`
                            }
                        </div>                    
                    </div>`;
    },
    prompt_above_buttons: true,
    button_choices: data.buttonText ? ['Next'] : [],
    button_html: () => {
      const t = taskStore().translations;

      if (data.buttonText) {
        return [
          `<button class="primary">
                  ${t[data.buttonText]}
          </button>`,
        ];
      }
    },
    keyboard_choices: 'NO_KEYS',
    post_trial_gap: 500,
    on_load: () => {
      const audioConfig: AudioConfigType = {
        restrictRepetition: {
          enabled: false,
          maxRepetitions: 1,
        },
        onEnded: () => {
          if (!data.buttonText) {
            jsPsych.finishTrial();
          }
        },
      };
      
      PageAudioHandler.playAudio(mediaAssets.audio[data.prompt], audioConfig);
      const pageStateHandler = new PageStateHandler(data.prompt, true);
      setupReplayAudio(pageStateHandler);

      // hide toast if it is there
      const toast = document.getElementById('lev-toast-default');
      if (toast) {
        toast.classList.remove('show');
      }
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

export const reverseOrderPrompt = instructions.pop();
export const reverseOrderInstructions = instructions.pop();
export const readyToPlay = instructions.pop();

export const defaultInstructions = instructions.slice(7,9)
export const downexInstructions = instructions.slice(0,7)
