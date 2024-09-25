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

const generateImageChoices = (choices) => {
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)] || practiceUrl;
    return `<img src=${imageUrl} alt=${choice} />`;
  });
}

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
    let isPracticeTrial = stim.assessmentStage === 'practice_response';
    return {
      save_trial: stim.assessmentStage !== 'instructions',
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

        ${stim.image && !Array.isArray(stim.image) ? 
          `<button class='image-medium' disabled>
            <img 
              src=${mediaAssets.images[camelize(stim.image)]} 
              alt=${stim.image}
            />
          </div>` : 
          ''
        }
        
        ${stim.image && Array.isArray(stim.image) ?
          `<div class='lev-stim-content' style="flex-direction: column;">
            ${stim.trialType === 'something-same-1'?
              `
              <div>
                <button class='image-medium no-pointer-events'>
                  <img 
                    src=${mediaAssets.images[camelize(stim.image[0])]} 
                    alt=${stim.image[0]}
                    class='top-image'
                  />
                </button>
              </div>
              `:
              ''
            }
            <div class='lev-response-row multi-4'>
              ${stim.image.map(shape => {
                return `<button class='image-medium no-pointer-events' style='margin: 0 4px'>
                          <img 
                            src=${mediaAssets.images[camelize(shape)]} 
                            alt=${shape} 
                          />
                      </button>`}
              ).join('')}
            </div>
          </div>` :
          ''
        }
      </div>`
    )
  },
  prompt_above_buttons: true,
  button_choices: () => {
    const stim = taskStore().nextStimulus;
    if (stim.assessmentStage === 'instructions') {
      return ['OK'];
    } else {
      const { choices } = prepareChoices(stim.answer, stim.distractors);
      return generateImageChoices(choices);
    }
  },
  button_html: () => {
    const stim = taskStore().nextStimulus;
    const buttonClass = stim.assessmentStage === 'instructions'
      ?'primary'
      : 'image-medium';
    return `<button class="${buttonClass}">%choice%</button>`;
  },
  response_ends_trial: () => !(
    taskStore().nextStimulus.trialType === 'test-dimensions' || taskStore().nextStimulus.assessmentStage === 'practice_response'
  ),
  on_load: () => {
    const audioFile = taskStore().nextStimulus.audioFile;
    const pageStateHandler = new PageStateHandler(audioFile);
    setupReplayAudio(pageStateHandler);
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup');
    buttonContainer.classList.add('lev-response-row');
    buttonContainer.classList.add('multi-4');
    const trialType = taskStore().nextStimulus.trialType; 
    const assessmentStage = taskStore().nextStimulus.assessmentStage;
    
    if (trialType === 'test-dimensions' || assessmentStage === 'practice_response'){ // cards should give feedback during test dimensions block
      const practiceBtns = Array.from(buttonContainer.children).map(btnDiv => btnDiv.firstChild);
      practiceBtns.forEach((card, i) =>
        card.addEventListener('click', async (e) => {

          handleButtonFeedback(card, practiceBtns, false, i);
        })
      )
    }
  },
  on_finish: (data) => {
    const stim = taskStore().nextStimulus;
    const choices = taskStore().choices;
    console.log('mark://onFinish', { choices, data, stim });

    // Always need to write correct key because of firekit.
    // TODO: Discuss with ROAR team to remove this check
    if (stim.assessmentStage !== 'instructions'){
      let isCorrect; 
      if (stim.trialType === 'test-dimensions' || stim.assessmentStage === 'practice_response'){ // if no incorrect answers were clicked, that trial is correct
        isCorrect = incorrectPracticeResponses.length === 0; 
      } else {
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

      if ((numIncorrect('numIncorrect') === maxIncorrect)) {
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
