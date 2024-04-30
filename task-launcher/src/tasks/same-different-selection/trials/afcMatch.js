import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import { prepareChoices } from '../../shared/helpers';
import { camelize } from '@bdelab/roar-utils';

let selectedCards = [];

export const afcMatch = {
  type: jsPsychAudioMultiResponse,
  stimulus: () => {
    const stimulus = store.session.get('nextStimulus');
    const file = camelize(stimulus.audioFile);
    return mediaAssets.audio[file];
  },
  prompt: () => {
    const stimulus = store.session.get('nextStimulus');
    const audiofile = camelize(stimulus.audioFile);
    const t = store.session.get('translations');
    return (
      `<div>
        <h1 id='prompt'>` +
      t[audiofile] +
      `</h1>
      </div>
      `
    );
  },
  on_load: () => {
    // create img elements and arrange in grid as cards
    // on click they will be selected
    // can select multiple cards and deselect them
    const stimulus = store.session.get('nextStimulus');
    let images;
    if (stimulus.audioFile.includes('prompt1')) {
      images = prepareChoices(stimulus.answer, stimulus.distractors).choices;
    } else {
      images = store.session.get('choices');
    }
    const numberOfCards = images.length;

    const expected = stimulus.trialType[0];

    const jsPsychContent = document.getElementById('jspsych-content');

    // create card container
    const cardContainer = document.createElement('div');
    cardContainer.id = 'card-container';
    cardContainer.class = '';

    // create cards
    for (let i = 0; i < numberOfCards; i++) {
      const card = document.createElement('div');
      card.className = 'img-btn';
      card.id = `card-${i}`;

      const img = document.createElement('img');
      img.src = mediaAssets.images[camelize(images[i])];
      img.alt = 'stimulus';

      card.dataset.id = images[i] || i;

      card.addEventListener('click', () => {
        if (card.classList.contains('selected')) {
          card.classList.remove('selected');
          selectedCards.splice(selectedCards.indexOf(card.dataset.id), 1);
        } else {
          card.classList.add('selected');
          selectedCards.push(card.dataset.id);
        }
      });

      card.appendChild(img);
      cardContainer.appendChild(card);
    }

    jsPsychContent.appendChild(cardContainer);

    // create continue button
    const continueButton = document.createElement('button');
    continueButton.id = 'continue-btn';
    continueButton.textContent = 'OK';

    continueButton.addEventListener('click', () => {
      if (selectedCards.length == expected) {
        jsPsych.finishTrial();
      }
    });

    jsPsychContent.appendChild(continueButton);
  },
  response_ends_trial: false,
  on_finish: (data) => {
    const stimulus = store.session.get('nextStimulus');
    // save data
    jsPsych.data.addDataToLastTrial({
      trialType: stimulus.trialType,
      answer: stimulus.answer,
      response: selectedCards,
    });

    selectedCards = [];
  },
};
