import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import { prepareChoices, replayButtonDiv, setupReplayAudio } from '../../shared/helpers';
import { camelize } from '@bdelab/roar-utils';

let selectedCards = [];

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
      answer: stim.answer || "No answer provided",
      response: selectedCards,
      correct: true,
    });

    // const shapes = ["square", "triangle", "circle"];
    // const sizes = ["sm", "med", "lg"];
    // const colors = ["red", "green", "blue"];


    // if (stim.requiredSelections == 2 &&
    //     stim.sameDifferent === 'same'
    //    ) 
    // {
    //   // Compare if strings in selectedCards are the same in any way
    //   // A string is the same if it shares the  same shape, size, or color
    //   const splitCards = selectedCards.map(card => card.split('-'));

      
    //   if (sameShape && sameSize && sameColor) {
    //     data.correct = true;
    //   }

    // } else if (stim.requiredSelections == 2 && 
    //            stim.sameDifferent === 'different'
    //           ) 
    // {
  
    // } else if (stim.requiredSelections == 3 && 
    //            stim.sameDifferent === 'same' && 
    //            affix === 'one way'
    //           ) 
    // {
    
    // }

    selectedCards = [];
  },
};