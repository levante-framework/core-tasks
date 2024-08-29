import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import store from 'store2';
import { mediaAssets } from '../../..';
import { PageStateHandler, prepareChoices, replayButtonSvg, setupReplayAudio, taskStore, PageAudioHandler } from '../../shared/helpers';
import { finishExperiment } from '../../shared/trials';
import { camelize } from '@bdelab/roar-utils';
import { jsPsych } from '../../taskSetup';

// This value is only saved in memory. It will reset to 0 when the page is reloaded.
export const numIncorrect = store.page.namespace('numIncorrect', 0);

const replayButtonHtmlId = 'replay-btn-revisited'; 
let incorrectPracticeResponses = []; 

function enableBtns(btnElements) {
  btnElements.forEach((btn) => (btn.removeAttribute('disabled')));
}

function handleButtonFeedback(btn, cards, isKeyBoardResponse, responsevalue) {
  const choice = btn.parentElement.id; 
  const answer = taskStore().correctResponseIdx.toString(); 

  const isCorrectChoice = choice.includes(answer); 
  let feedbackAudio;
  if (isCorrectChoice) {
    btn.classList.add('practice-correct');
    feedbackAudio = mediaAssets.audio.feedbackGoodJob;
    setTimeout(
      () => jsPsych.finishTrial({
        response: choice,
        incorrectPracticeResponses, 
        button_response: !isKeyBoardResponse ? responsevalue : null,
        keyboard_response: isKeyBoardResponse ? responsevalue : null,
      }),
      1000,
    );
  } else {
    btn.classList.add('practice-incorrect');
    feedbackAudio = mediaAssets.audio.feedbackTryAgain;
    // renable buttons
    setTimeout(() => enableBtns(cards), 500);
    incorrectPracticeResponses.push(choice);
  }
  PageAudioHandler.playAudio(feedbackAudio);
}

export const stimulus = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    const stim = taskStore().nextStimulus;
    let isPracticeTrial = stim.assessmentStage == 'practice_response';
    return {
      save_trial: stim.trialType !== 'instructions',
      assessment_stage: stim.assessmentStage,
        // not for firekit
      isPracticeTrial: isPracticeTrial,
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
    if (stim.trialType == 'something-same-1' || stim.trialType == 'instructions') {
      return ['OK'];
    } else if (stim.trialType == 'something-same-2' || stim.trialType == 'test-dimensions') {
      const { choices } = prepareChoices(stim.answer, stim.distractors);
      return choices;
    }

    return choices;
  },
  button_html: () => {
    const stim = taskStore().nextStimulus;
    if (stim.trialType == 'something-same-1' || stim.trialType == 'instructions') {
      return "<button id='sds-continue-btn' class='primary'>OK</button>";
    }

    const choices = taskStore().choices;
    const allButtons = choices.map((choice, ind) => {
      const img = mediaAssets.images[camelize(choice)];
      return`<button class='base-image-container'> <img src=${img} alt='shape' /> </button>`;
    });

    return allButtons;
  },
  response_ends_trial: () => !(
    taskStore().nextStimulus.trialType == 'test-dimensions' || taskStore().nextStimulus.assessmentStage == 'practice_response'
  ),
  on_load: () => {
    const audioFile = taskStore().nextStimulus.audioFile;
    const pageStateHandler = new PageStateHandler(audioFile);
    setupReplayAudio(pageStateHandler);

    const trialType = taskStore().nextStimulus.trialType; 
    const assessmentStage = taskStore().nextStimulus.assessmentStage;
    const cards = document.querySelectorAll('.base-image-container');  
    
    if (trialType == 'test-dimensions' || assessmentStage == 'practice_response'){ // cards should give feedback during test dimensions block
      cards.forEach((card, i) =>
        card.addEventListener('click', async (e) => {
          handleButtonFeedback(card, cards, false, i);
        })
      )
    }
  },
  on_finish: (data) => {
    const stim = taskStore().nextStimulus;
    const choices = taskStore().choices;

    // Always need to write correct key because of firekit.
    // TODO: Discuss with ROAR team to remove this check
    if (stim.trialType != 'instructions'){
      let isCorrect; 
      if (stim.trialType == 'test-dimensions' || stim.assessmentStage == 'practice_response'){ // if no incorrect answers were clicked, that trial is correct
        isCorrect = incorrectPracticeResponses.length == 0; 
      } else if (stim.trialType != 'something-same-1' && stim.trialType != 'instructions'){ // isCorrect should be undefined for something-same-1 trials
        isCorrect = data.button_response === taskStore().correctResponseIdx
      } 

      incorrectPracticeResponses = []; 
    
      // update task store
      taskStore('isCorrect', isCorrect);

      if (isCorrect === false) {
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
  }
}
};
