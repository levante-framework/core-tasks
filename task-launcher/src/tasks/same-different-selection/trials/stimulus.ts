import jsPsychHtmlMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
//@ts-ignore
import { PageStateHandler, prepareChoices, replayButtonSvg, setupReplayAudio, PageAudioHandler, camelize } from '../../shared/helpers';
//@ts-ignore
import { finishExperiment } from '../../shared/trials';
//@ts-ignore
import { jsPsych } from '../../taskSetup';
import { taskStore } from '../../../taskStore';
import { handleStaggeredButtons } from '../../shared/helpers/staggerButtons';


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

function handleButtonFeedback(
  btn: HTMLButtonElement, 
  cards: HTMLButtonElement[], 
  isKeyBoardResponse: boolean, 
  responsevalue: number, 
  correctAudio: string
) {
  const choice = btn?.parentElement?.id || ''; 
  const answer = taskStore().correctResponseIdx.toString(); 

  const isCorrectChoice = choice.includes(answer); 
  let feedbackAudio;
  if (isCorrectChoice) {
    btn.classList.add('success-shadow');
    feedbackAudio = mediaAssets.audio[correctAudio];
  } else {
    btn.classList.add('error-shadow');
    feedbackAudio = mediaAssets.audio.feedbackTryAgain;
    // renable buttons
    setTimeout(() => enableBtns(cards), 500);
    incorrectPracticeResponses.push(choice);
  }

  function finishTrial() {
    jsPsych.finishTrial({
      response: choice,
      incorrectPracticeResponses, 
      button_response: !isKeyBoardResponse ? responsevalue : null,
      keyboard_response: isKeyBoardResponse ? responsevalue : null,
    });
  }

  isCorrectChoice ? 
  PageAudioHandler.playAudio(feedbackAudio, finishTrial) :
  PageAudioHandler.playAudio(feedbackAudio)
}

export const stimulus = (trial?: StimulusType) => {
  return {
  type: jsPsychHtmlMultiResponse,
  data: () => {
    const stim = trial || taskStore().nextStimulus;
    let isPracticeTrial = stim.assessmentStage === 'practice_response';
    return {
      save_trial: stim.assessmentStage !== 'instructions',
      assessment_stage: stim.assessmentStage,
        // not for firekit
      isPracticeTrial: isPracticeTrial,
    };
  },
  stimulus: () => {
    const stim = trial || taskStore().nextStimulus;
    let prompt = camelize(stim.audioFile);
    if (taskStore().heavyInstructions && stim.assessmentStage !== "practice_response" && stim.trialType !== "instructions") {
      prompt += "Heavy";
    }

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
    const stim = trial || taskStore().nextStimulus;
    if (stim.trialType === 'instructions' || stim.trialType == "something-same-1") {
      return ['OK'];
    } else {
      // Randomize choices if there is an answer
      const { choices } = prepareChoices(stim.answer, stim.distractors, !!stim.answer);
      return generateImageChoices(choices);
    }
  },
  button_html: () => {
    const stim = trial || taskStore().nextStimulus;
    const buttonClass = (stim.trialType === 'instructions') || (stim.trialType === "something-same-1")
      ? 'primary'
      : 'image-medium';
    return `<button class="${buttonClass}">%choice%</button>`;
  },
  response_ends_trial: () => {
    const stim = trial || taskStore().nextStimulus;
    return !(stim.trialType === 'test-dimensions' || (stim.assessmentStage === 'practice_response' && stim.trialType !== "something-same-1")); 
  },
  on_load: () => {
    startTime = performance.now();
    const stimulus = trial || taskStore().nextStimulus;
    let audioFile = stimulus.audioFile;
    if (taskStore().heavyInstructions && stimulus.assessmentStage !== "practice_response" && stimulus.trialType !== "instructions") {
      audioFile += "-heavy";
    }

    PageAudioHandler.playAudio(mediaAssets.audio[camelize(audioFile)]);

    const pageStateHandler = new PageStateHandler(audioFile);
    setupReplayAudio(pageStateHandler);
    const buttonContainer = document.getElementById('jspsych-html-multi-response-btngroup') as HTMLDivElement;
    buttonContainer.classList.add('lev-response-row');
    buttonContainer.classList.add('multi-4');
    const trialType = stimulus.trialType; 
    const assessmentStage = stimulus.assessmentStage;

    if (stimulus.trialType === 'something-same-2' && taskStore().heavyInstructions) {
      handleStaggeredButtons(
        pageStateHandler, 
        buttonContainer, 
        ['same-different-selection-highlight-1', 'same-different-selection-highlight-2'],
      );
    }
    
    if (trialType === 'test-dimensions' || (assessmentStage === 'practice_response' && trialType !== "something-same-1")){ // cards should give feedback during test dimensions block
      const practiceBtns = Array.from(buttonContainer.children)
        .map(btnDiv => btnDiv.firstChild)
        .filter(btn => !!btn) as HTMLButtonElement[];

      let correctAudio; 
      if (stimulus.itemId === "sds-something-same-1-test-heavy") {
        correctAudio = "sdsFeedbackBothBlue";
      } else if (stimulus.itemId === "sds-something-same-2-test-heavy") {
        correctAudio = "sdsFeedbackBothLarge";
      } else {
        correctAudio = "feedbackGoodJob"
      }
      
      practiceBtns.forEach((card, i) =>
        card.addEventListener('click', async (e) => {
          handleButtonFeedback(card, practiceBtns, false, i, correctAudio);
        })
      )
    }
  },
  on_finish: (data: any) => {
    const stim = trial || taskStore().nextStimulus;
    const choices = taskStore().choices;
    const endTime = performance.now();

    PageAudioHandler.stopAndDisconnectNode();

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

      // if heavy instructions is true, show data quality screen before ending 
      if ((taskStore().numIncorrect >= taskStore().maxIncorrect) && !taskStore().heavyInstructions) {
        finishExperiment();
      }
    }
}
}
};
