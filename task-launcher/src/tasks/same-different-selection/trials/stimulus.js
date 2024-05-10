import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';
import { prepareChoices, replayButtonDiv, setupReplayAudio } from '../../shared/helpers';
import { finishExperiment } from '../../shared/trials';
import { camelize } from '@bdelab/roar-utils';
import { jsPsych } from '../../taskSetup';

// This value is only saved in memory. It will reset to 0 when the page is reloaded.
export const numIncorrect = store.page.namespace('numIncorrect', 0);

export const stimulus = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    const stim = store.session.get('nextStimulus');
    return {
      save_trial: stim.trialType !== 'instructions',
      assessment_stage: stim.task,
        // not for firekit
      isPracticeTrial: stim.notes === 'practice',
    };
  },
  stimulus: () => {
    const stimulusAudio = store.session.get('nextStimulus').audioFile;
    return mediaAssets.audio[camelize(stimulusAudio)];
  },
  prompt: () => {
    const stim = store.session.get('nextStimulus');
    const prompt = camelize(stim.audioFile);
    const t = store.session.get('translations');
    return (
      `<div id='stimulus-container'>
        ${replayButtonDiv}
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
    const stim = store.session.get('nextStimulus');
    if (stim.trialType == 'something-same-1') {
      return ['OK'];
    } else if (stim.trialType == 'something-same-2' || stim.trialType == 'test-dimensions') {
      const { choices } = prepareChoices(stim.answer, stim.distractors);
      return choices;
    }

    return choices;
  },
  button_html: () => {
    const stim = store.session.get('nextStimulus');
    if (stim.trialType == 'something-same-1') {
      return "<button id='sds-continue-btn'>OK</button>";
    }

    const choices = store.session.get('choices');
    const allButtons = choices.map((choice, ind) => {
      const img = mediaAssets.images[camelize(choice)];
      return`<button class='base-image-container'> <img src=${img} alt='shape' /> </button>`;
    });

    return allButtons;
  },
  on_load: () => {
    let audioSource
    const audioFile = camelize(store.session.get('nextStimulus').audioFile);
    setupReplayAudio(audioSource, audioFile);
  },
  on_finish: (data) => {
    const stim = store.session.get('nextStimulus');
    const choices = store.session.get('choices');

    // Always need to write correct key because of firekit.
    // TODO: Discuss with ROAR team to remove this check
    const isCorrect = data.button_response === store.session.get('correctResponseIdx')

    if (!isCorrect) {
      numIncorrect.transact('numIncorrect', (n) => n + 1);
    } else {
      numIncorrect('numIncorrect', 0);
    }

    const maxIncorrect = store.session.get('config').maxIncorrect;

    if ((numIncorrect('numIncorrect') == maxIncorrect) || store.session.get('maxTimeReached')) {
      finishExperiment();
    }

    jsPsych.data.addDataToLastTrial({
      correct: isCorrect,
    });

    // Only save on ss2 since ss1 is a display trial
    if (stim.trialType === 'something-same-2' || stim.trialType == 'test-dimensions') {
      jsPsych.data.addDataToLastTrial({
        // specific to this trial
        item: stim.item,
        answer: stim.answer,
        distractors: stim.distractors,
        corpusTrialType: stim.trialType,
        response: choices[data.button_response],
      });
    }
  },
};