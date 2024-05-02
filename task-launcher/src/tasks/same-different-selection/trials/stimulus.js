import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';
import { prepareChoices, replayButtonDiv, setupReplayAudio } from '../../shared/helpers';
import { camelize } from '@bdelab/roar-utils';
import { jsPsych } from '../../taskSetup';

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
                return `<div class='base-image-container'>
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
    jsPsych.data.addDataToLastTrial({
      correct: true,
    });

  },
};