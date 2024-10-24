import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
//@ts-ignore
import { PageStateHandler, prepareChoices, replayButtonSvg, setupReplayAudio, taskStore, PageAudioHandler, camelize } from '../../shared/helpers';
//@ts-ignore
import { finishExperiment } from '../../shared/trials';
//@ts-ignore
import { jsPsych } from '../../taskSetup';

const replayButtonHtmlId = 'replay-btn-revisited'; 
let incorrectPracticeResponses: string[] = [];
let startTime: number; 

const generateImageChoices = (choices: string[]) => {
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)];
    return `<img src=${imageUrl} alt=${choice} />`;
  });
}

function enableBtns(btnElements: HTMLButtonElement[]) {
  btnElements.forEach((btn) => (btn.removeAttribute('disabled')));
}

function handleButtonFeedback(btn: HTMLButtonElement, cards: HTMLButtonElement[], isKeyBoardResponse: boolean, responsevalue: number) {
  const choice = btn?.parentElement?.id || ''; 
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
              <div style="visibility: hidden;">
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
              ${(stim.image as string[]).map(shape => {
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
      // Randomize choices if there is an answer
      const { choices } = prepareChoices(stim.answer, stim.distractors, !!stim.answer);
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
    startTime = performance.now();
    const audioFile = taskStore().nextStimulus.audioFile;
    const pageStateHandler = new PageStateHandler(audioFile);
    setupReplayAudio(pageStateHandler);
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup') as HTMLDivElement;
    buttonContainer.classList.add('lev-response-row');
    buttonContainer.classList.add('multi-4');
    const trialType = taskStore().nextStimulus.trialType; 
    const assessmentStage = taskStore().nextStimulus.assessmentStage;
    
    if (trialType === 'test-dimensions' || assessmentStage === 'practice_response'){ // cards should give feedback during test dimensions block
      const practiceBtns = Array.from(buttonContainer.children)
        .map(btnDiv => btnDiv.firstChild)
        .filter(btn => !!btn) as HTMLButtonElement[];
      practiceBtns.forEach((card, i) =>
        card.addEventListener('click', async (e) => {

          handleButtonFeedback(card, practiceBtns, false, i);
        })
      )
    }
  },
  on_finish: (data: any) => {
    const stim = taskStore().nextStimulus;
    const choices = taskStore().choices;
    const endTime = performance.now();

    jsPsych.data.addDataToLastTrial({
      audioButtonPresses: PageAudioHandler.replayPresses
    });

    // Always need to write correct key because of firekit.
    // TODO: Discuss with ROAR team to remove this check
    if (stim.assessmentStage !== 'instructions') {
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
        taskStore.transact('numIncorrect', (oldVal: number) => oldVal + 1);
      } else {
        taskStore('numIncorrect', 0);
      }

      jsPsych.data.addDataToLastTrial({
        // specific to this trial
        item: stim.item,
        answer: stim.answer,
        correct: isCorrect,
        distractors: stim.distractors,
        corpusTrialType: stim.trialType,
        response: choices[data.button_response],
        responseLocation: data.button_response, 
      });

      if (stim.trialType === 'test-dimensions' || stim.assessmentStage === 'practice_response') {
        const calculatedRt = Math.round(endTime - startTime);

        jsPsych.data.addDataToLastTrial({
          rt: calculatedRt
        })
      }

      if ((taskStore().numIncorrect >= taskStore().maxIncorrect)) {
        finishExperiment();
      }
    }
}
};
