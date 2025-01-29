import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
// @ts-ignore
import { jsPsych } from '../../taskSetup';
// @ts-ignore
import { prepareChoices, replayButtonSvg, setupReplayAudio, PageStateHandler, PageAudioHandler, camelize } from '../../shared/helpers';
// @ts-ignore
import { finishExperiment } from '../../shared/trials';
import { taskStore } from '../../../taskStore';

let selectedCards: string[] = [];
let selectedCardIdxs: number[] = [];
let previousSelections: string[] = [];
let startTime: number; 

const replayButtonHtmlId = 'replay-btn-revisited';
const SELECT_CLASS_NAME = 'info-shadow';

const generateImageChoices = (choices: string[]) => {
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)];
    return `<img src=${imageUrl} alt=${choice} />`;
  });
};

function enableBtns(btnElements: HTMLButtonElement[]) {
  btnElements.forEach((btn) => (btn.removeAttribute('disabled')));
}

export const afcMatch = {
  type: jsPsychAudioMultiResponse,
  data: () => {
    const stim = taskStore().nextStimulus;
    let isPracticeTrial = stim.assessmentStage === 'practice_response';
    return {
      save_trial: stim.trialType !== 'instructions',
      assessment_stage: stim.assessmentStage,
        // not for firekit
      isPracticeTrial: isPracticeTrial,
    };
  },
  stimulus: () => {
    const stim = taskStore().nextStimulus;
    const audioFile = camelize(stim.audioFile);

    return mediaAssets.audio[audioFile];
  },
  prompt: () => {
    const stimulus = taskStore().nextStimulus;
    let prompt = camelize(stimulus.audioFile);
    if (taskStore().heavyInstructions && stimulus.assessmentStage !== "practice_response" && stimulus.trialType !== "instructions") {
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
      </div>`
    );
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
  on_load: () => {
    // create img elements and arrange in grid as cards
    // on click they will be selected
    // can select multiple cards and deselect them
    startTime = performance.now();
    const stim = taskStore().nextStimulus;

    let audioFile = stim.audioFile;
    if (taskStore().heavyInstructions  && stim.assessmentStage !== "practice_response" && stim.trialType !== "instructions") {
      audioFile += "-heavy";
    }

    const pageStateHandler = new PageStateHandler(audioFile, true);
    setupReplayAudio(pageStateHandler);
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup') as HTMLDivElement;
    const responseBtns = Array.from(buttonContainer.children)
      .map(btnDiv => btnDiv.firstChild as HTMLButtonElement)
      .filter(btn => !!btn);
    if (responseBtns.length === 5) { // 3 x 2 button layout
      buttonContainer.classList.add('lev-response-row-inline', 'grid-3x2');
    } else { // linear button layout
      buttonContainer.classList.add('lev-response-row', 'multi-4');
    }
    responseBtns.forEach((card, i) =>
      card.addEventListener('click', async (e) => {
        const answer = (card?.firstChild as HTMLImageElement)?.alt;
        if (!card) {
          return;
        }
        if (card.classList.contains(SELECT_CLASS_NAME)) {
          card.classList.remove(SELECT_CLASS_NAME);
          selectedCards.splice(selectedCards.indexOf(answer), 1);
          selectedCardIdxs.splice(selectedCardIdxs.indexOf(i), 1);
        } else {
          card.classList.add(SELECT_CLASS_NAME);
          selectedCards.push(answer);
          selectedCardIdxs.push(i);
          // afcMatch trial types look like n-match / n-unique
          const requiredSelections = stim.requiredSelections;

          if (selectedCards.length === requiredSelections) {
            jsPsych.finishTrial();
          }
        }
        setTimeout(() => enableBtns(responseBtns), 500);
      })
    );
  },
  response_ends_trial: false,
  on_finish: () => {
    const stim = taskStore().nextStimulus;

    const endTime = performance.now();
    const calculatedRt = endTime - startTime; 

    // save data
    jsPsych.data.addDataToLastTrial({
      corpusTrialType: stim.trialType,
      answer: stim.answer || null,
      response: selectedCards,
      distractors: stim.distractors,
      item: stim.item,
      rt: Math.round(calculatedRt),
      audioButtonPresses: PageAudioHandler.replayPresses,
      responseLocation: selectedCardIdxs,
    });
  
    if (stim.audioFile.split('-')[2] === 'prompt1') {
      // Prompt 1 is the start and prompt 2 trials are when the selections
      // Must be different from previous selections
      previousSelections = [];
    }

    // First check amongst the selections if they all share one trait
    // Second check if any previous selections used those EXACT same selections
    // At least one selection must be different from previous selections
    // (also, ignore any specified dimension -- some blocks now don't vary particular dimensions)
    function compareSelections(selections: string[], previousSelections: string[], ignoreDims: string[]) {
      const dimensionIndices = {
          size: 0,
          color: 1,
          shape: 2,
          number: 3,
          bgcolor: 4,
      };
  
      // Check if all selections share at least one common trait (ignoring specified dimensions)
      function sharedTrait(selections: string[], ignoreDims: string[]) {
          const sets: Record<string, Set<string>> = {};
  
          // Initialize sets for each non-ignored dimension
          for (const [dim, index] of Object.entries(dimensionIndices)) {
              if (!ignoreDims.includes(dim)) {
                  sets[dim] = new Set();
              }
          }
  
          // Populate sets with values from selections
          for (const sel of selections) {
              const attributes = sel.split("-");
              for (const [dim, set] of Object.entries(sets)) {
                  const index = dimensionIndices[dim as keyof typeof dimensionIndices];
                  if (attributes[index] !== undefined) {
                      set.add(attributes[index]);
                  }
              }
          }
  
          // Check if any non-ignored dimension has all the same values
          return Object.values(sets).some(set => set.size === 1);
      }
  
      // Check if any selection is different from all previous selections
      function hasNewSelection(selections: string[], previousSelections: string[]) {
          // If there are no previous selections, every current selection is considered new
          if (!previousSelections || previousSelections.length === 0) {
              return true;
          }
  
          const allPrevious = new Set(previousSelections);
          return selections.some(sel => !allPrevious.has(sel));
      }
  
      // Perform checks
      const traitShared = sharedTrait(selections, ignoreDims);
      const containsNew = hasNewSelection(selections, previousSelections);
  
      return traitShared && containsNew;
    }

    let ignoreDims: string[] = [];
    if(stim.trialType === 'something-same-2') {
      ignoreDims = ["number","bgcolor"];
    } else if(stim.trialType === '2-match') {
      ignoreDims = ["number","bgcolor"]; 
    } else if(stim.trialType === '3-match' || stim.trialType === '4-match') {
      ignoreDims = ["size"];
    } 
    const isCorrect = compareSelections(selectedCards, previousSelections, ignoreDims);

    // update task store
    taskStore('isCorrect', isCorrect); 

    if (isCorrect === false) {
      taskStore.transact('numIncorrect', (oldVal: number) => oldVal + 1);
    } else {
      taskStore('numIncorrect', 0);
    }
    
    jsPsych.data.addDataToLastTrial({
      correct: isCorrect,
    });
    previousSelections.push(...selectedCards);
    selectedCards = [];
    selectedCardIdxs = [];

    // if heavy instructions is true, show data quality screen before ending 
    if ((taskStore().numIncorrect >= taskStore().maxIncorrect) && !taskStore().heavyInstructions) {
      finishExperiment();
    }
  },
};
