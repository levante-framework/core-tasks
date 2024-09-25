import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import { jsPsych } from '../../taskSetup';
import { prepareChoices, replayButtonSvg, setupReplayAudio, taskStore, PageStateHandler } from '../../shared/helpers';
import { camelize } from '@bdelab/roar-utils';
import { finishExperiment } from '../../shared/trials';
import { numIncorrect } from './stimulus';

let selectedCards = [];
let previousSelections = [];

const replayButtonHtmlId = 'replay-btn-revisited';

const generateImageChoices = (choices) => {
  return choices.map((choice) => {
    const imageUrl = mediaAssets.images[camelize(choice)] || practiceUrl;
    return `<img src=${imageUrl} alt=${choice} />`;
  });
};

function enableBtns(btnElements) {
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
    const stimulusAudio = camelize(taskStore().nextStimulus.audioFile);
    return mediaAssets.audio[stimulusAudio];
  },
  prompt: () => {
    const prompt = camelize(taskStore().nextStimulus.audioFile);
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
  on_load: () => {
    // create img elements and arrange in grid as cards
    // on click they will be selected
    // can select multiple cards and deselect them
    const stim = taskStore().nextStimulus;
    console.log('mark://', 'AfcMatch Onload', {stim});
    
    const audioFile = stim.audioFile;
    const pageStateHandler = new PageStateHandler(audioFile);
    setupReplayAudio(pageStateHandler);
    const buttonContainer = document.getElementById('jspsych-audio-multi-response-btngroup');
    buttonContainer.classList.add('lev-response-row');
    buttonContainer.classList.add('multi-4');
    const responseBtns = Array.from(buttonContainer.children).map(btnDiv => btnDiv.firstChild);
    responseBtns.forEach((card, i) =>
      card.addEventListener('click', async (e) => {
        console.log('mark://', 'clicked card', {card, responseBtns, choices: taskStore().choices, answer: card.firstChild?.alt});
        const answer = card.firstChild?.alt;
        // handleButtonFeedback(card, practiceBtns, false, i);
        if (card.classList.contains('selected')) {
          card.classList.remove('selected');
          selectedCards.splice(selectedCards.indexOf(answer), 1);
        } else {
          card.classList.add('selected');
          selectedCards.push(answer);
          // afcMatch trial types look like n-match / n-unique
          const requiredSelections = stim.requiredSelections;

          if (selectedCards.length === requiredSelections) {
            jsPsych.finishTrial();
          }
        }
        setTimeout(() => enableBtns(responseBtns), 500);
      })
    );

    // let images;
    // if (stim.audioFile.includes('prompt1')) {
    //   images = prepareChoices(stim.answer, stim.distractors).choices;
    // } else {
    //   images = taskStore().choices;
    // }
    // const numberOfCards = images.length;

    // const jsPsychContent = document.getElementById('jspsych-content');

    // // create card container
    // const cardContainer = document.createElement('div');
    // cardContainer.id = 'card-container';


    // // create cards
    // for (let i = 0; i < numberOfCards; i++) {
    //   const card = document.createElement('div');
    //   card.className = 'card';
    //   // card.id = `card-${i}`;

    //   const img = document.createElement('img');
    //   img.src = mediaAssets.images[camelize(images[i])];
    //   img.alt = images[i];

    //   card.dataset.id = images[i] || i;

    //   card.addEventListener('click', () => {
    //     if (card.classList.contains('selected')) {
    //       card.classList.remove('selected');
    //       selectedCards.splice(selectedCards.indexOf(card.dataset.id), 1);
    //     } else {
    //       card.classList.add('selected');
    //       selectedCards.push(card.dataset.id);

    //       // afcMatch trial types look like n-match / n-unique
    //       const requiredSelections = stim.requiredSelections;

    //       if (selectedCards.length == requiredSelections) {
    //         jsPsych.finishTrial();
    //       }
    //     }
    //   });

    //   card.appendChild(img);
    //   cardContainer.appendChild(card);
    // }

    // jsPsychContent.appendChild(cardContainer);

  },
  response_ends_trial: false,
  on_finish: (data) => {
    const stim = taskStore().nextStimulus;
    // save data
    jsPsych.data.addDataToLastTrial({
      corpusTrialType: stim.trialType,
      answer: stim.answer || null,
      response: selectedCards,
      distractors: stim.distractors,
      item: stim.item,
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
    function compareSelections(selections, previousSelections, ignoreDims) {
      const dimensionIndices = {
          size: 0,
          color: 1,
          shape: 2,
          number: 3,
          bgcolor: 4,
      };
  
      // Check if all selections share at least one common trait (ignoring specified dimensions)
      function sharedTrait(selections, ignoreDims) {
          const sets = {};
  
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
                  const index = dimensionIndices[dim];
                  if (attributes[index] !== undefined) {
                      set.add(attributes[index]);
                  }
              }
          }
  
          // Check if any non-ignored dimension has all the same values
          return Object.values(sets).some(set => set.size === 1);
      }
  
      // Check if any selection is different from all previous selections
      function hasNewSelection(selections, previousSelections) {
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

    let ignoreDims = [];
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

    if (!isCorrect) {
      numIncorrect.transact('numIncorrect', (n) => n + 1);
    } else {
      numIncorrect('numIncorrect', 0);
    }

    const maxIncorrect = taskStore().maxIncorrect;

    if ((numIncorrect('numIncorrect') === maxIncorrect)) {
      finishExperiment();
    }
    
    
    jsPsych.data.addDataToLastTrial({
      correct: isCorrect,
    });

    previousSelections.push(...selectedCards);

    selectedCards = [];
  },
};
