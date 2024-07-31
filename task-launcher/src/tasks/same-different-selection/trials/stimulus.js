import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';
import { PageStateHandler, prepareChoices, replayButtonSvg, setupReplayAudio, taskStore } from '../../shared/helpers';
import { finishExperiment } from '../../shared/trials';
import { camelize } from '@bdelab/roar-utils';
import { jsPsych } from '../../taskSetup';

// This value is only saved in memory. It will reset to 0 when the page is reloaded.
export const numIncorrect = store.page.namespace('numIncorrect', 0);

const replayButtonHtmlId = 'replay-btn-revisited'; 

export const stimulus = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    const stim = taskStore().nextStimulus;
    return {
      save_trial: stim.trialType !== 'instructions',
      assessment_stage: stim.task,
        // not for firekit
      isPracticeTrial: stim.notes === 'practice',
    };
  },
  stimulus: () => {
    const stimulusAudio = taskStore().nextStimulus.audioFile;
    return mediaAssets.audio[camelize(stimulusAudio)];
  },
  prompt: () => {
    const stim = taskStore().nextStimulus;
    const prompt = camelize(stim.audioFile);
    const t = taskStore().translations;
    return (
      `<div id='stimulus-container'>
        <button
            id="${replayButtonHtmlId}"
            class="replay"
        >
            ${replayButtonSvg}
        </button>
        <div id='prompt-container-text'>
          <p id='prompt'>${t[prompt]}</p>
        </div>

        ${stim.image && !Array.isArray(stim.image) ? 
          `<div class='sds-prompt-image-container'>
            <img 
              src=${mediaAssets.images[camelize(stim.image)]} 
              alt=${stim.image}
            />
          </div>` : 
          ''
        }
        
        ${stim.image && Array.isArray(stim.image) ?
          `<div class='sds-prompt-pyramid-container'>
            ${stim.trialType == 'something-same-1'? 
              `<img 
                src=${mediaAssets.images[camelize(stim.image[0])]} 
                alt=${stim.image[0]}
                class='top-image'
              />`:
              ''
            }
            <div class='sds-prompt-pyramid-base'>
              ${stim.image.map(shape => {
                return `<div class='base-image-container' style='cursor: default;'>
                          <img 
                            src=${mediaAssets.images[camelize(shape)]} 
                            alt=${shape} 
                          />
                      </div>`}
              ).join('')}
            </div>
          </div>` :
          ''
        }
      <div >`
    )
  },
  prompt_above_buttons: true,
  button_choices: () => {
    const stim = taskStore().nextStimulus;
    if (stim.trialType == 'something-same-1') {
      return ['OK'];
    } else if (stim.trialType == 'something-same-2' || stim.trialType == 'test-dimensions') {
      const { choices } = prepareChoices(stim.answer, stim.distractors);
      return choices;
    }

    return choices;
  },
  button_html: () => {
    const stim = taskStore().nextStimulus;
    if (stim.trialType == 'something-same-1') {
      return "<button id='sds-continue-btn'>OK</button>";
    }

    const choices = taskStore().choices;
    const allButtons = choices.map((choice, ind) => {
      const img = mediaAssets.images[camelize(choice)];
      return`<button class='base-image-container'> <img src=${img} alt='shape' /> </button>`;
    });

    return allButtons;
  },
  on_load: () => {
    const audioFile = taskStore().nextStimulus.audioFile;
    const pageStateHandler = new PageStateHandler(audioFile);
    setupReplayAudio(pageStateHandler);
  },
  on_finish: (data) => {
    const stim = taskStore().nextStimulus;
    const choices = taskStore().choices;

    // Always need to write correct key because of firekit.
    // TODO: Discuss with ROAR team to remove this check
    const isCorrect = data.button_response === taskStore().correctResponseIdx
    
    // update task store
    taskStore('isCorrect', isCorrect);

    if (!isCorrect) {
      numIncorrect.transact('numIncorrect', (n) => n + 1);
    } else {
      numIncorrect('numIncorrect', 0);
    }

    const maxIncorrect = taskStore().maxIncorrect;

    if ((numIncorrect('numIncorrect') == maxIncorrect)) {
      finishExperiment();
    }

    jsPsych.data.addDataToLastTrial({
      // specific to this trial
      item: stim.item,
      answer: stim.answer,
      correct: isCorrect,
      distractors: stim.distractors,
      corpusTrialType: stim.trialType,
      response: choices[data.button_response],
    });
  },
};
