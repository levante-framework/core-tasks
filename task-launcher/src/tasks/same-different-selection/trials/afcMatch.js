import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import { prepareChoices, replayButtonDiv, setupReplayAudio } from '../../shared/helpers';
import { camelize } from '@bdelab/roar-utils';
import { finishExperiment } from '../../shared/trials';
import { numIncorrect } from './stimulus';

let selectedCards = [];
let previousSelections = [];

export const afcMatch = {
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
    const stimulusAudio = camelize(store.session.get('nextStimulus').audioFile);
    return mediaAssets.audio[stimulusAudio];
  },
  prompt: () => {
    const prompt = camelize(store.session.get('nextStimulus').audioFile);
    const t = store.session.get('translations');
    return (
      `<div id='stimulus-container'>
        ${replayButtonDiv}
        <div id='prompt-container-text'>
          <p id='prompt'>${t[prompt]}</p>
        </div>
      </div>`
    );
  },
  on_load: () => {
    // create img elements and arrange in grid as cards
    // on click they will be selected
    // can select multiple cards and deselect them
    let audioSource

    const stim = store.session.get('nextStimulus');
    
    const audioFile = camelize(stim.audioFile);
    setupReplayAudio(audioSource, audioFile);

    let images;
    if (stim.audioFile.includes('prompt1')) {
      images = prepareChoices(stim.answer, stim.distractors).choices;
    } else {
      images = store.session.get('choices');
    }
    const numberOfCards = images.length;

    const jsPsychContent = document.getElementById('jspsych-content');

    // create card container
    const cardContainer = document.createElement('div');
    cardContainer.id = 'card-container';


    // create cards
    for (let i = 0; i < numberOfCards; i++) {
      const card = document.createElement('div');
      card.className = 'card';
      // card.id = `card-${i}`;

      const img = document.createElement('img');
      img.src = mediaAssets.images[camelize(images[i])];
      img.alt = images[i];

      card.dataset.id = images[i] || i;

      card.addEventListener('click', () => {
        if (card.classList.contains('selected')) {
          card.classList.remove('selected');
          selectedCards.splice(selectedCards.indexOf(card.dataset.id), 1);
        } else {
          card.classList.add('selected');
          selectedCards.push(card.dataset.id);

          // afcMatch trial types look like n-match / n-unique
          const requiredSelections = stim.requiredSelections;

          if (selectedCards.length == requiredSelections) {
            jsPsych.finishTrial();
          }
        }
      });

      card.appendChild(img);
      cardContainer.appendChild(card);
    }

    jsPsychContent.appendChild(cardContainer);

  },
  response_ends_trial: false,
  on_finish: (data) => {
    const stim = store.session.get('nextStimulus');
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


    function compareSelections(selections, previousSelections) {  
      const parsedSelections = selections.map(sel => sel.split("-"));
  
      // Check if all selections share at least one common trait
      function sharedTrait(selections) {
          const sizesAt = selections.map(sel => sel[0]);
          const colorsAt = selections.map(sel => sel[1]);
          const shapesAt = selections.map(sel => sel[2]);
          const numsAt = selections.map(sel => sel[3]);
  
          const sizeSet = new Set(sizesAt);
          const colorSet = new Set(colorsAt);
          const shapeSet = new Set(shapesAt);
          
          let numSet = new Set();

          if (numsAt[0]) {
            numSet.add(numsAt);
          }
  
          return sizeSet.size === 1 || colorSet.size === 1 || shapeSet.size === 1 || numSet.size === 1;
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
      const traitShared = sharedTrait(parsedSelections);
      const containsNew = hasNewSelection(selections, previousSelections);
  
      return traitShared && containsNew;
    }

    const isCorrect = compareSelections(selectedCards, previousSelections);

    if (!isCorrect) {
      numIncorrect.transact('numIncorrect', (n) => n + 1);
    } else {
      numIncorrect('numIncorrect', 0);
    }

    const maxIncorrect = store.session.get('config').maxIncorrect;

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