import JsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { jsPsych } from '../../taskSetup';

let selectedCards = [];

export const afcMatch = {
  type: JsPsychHTMLMultiResponse,
  stimulus: () => {
    return `<div>
        <h1 id='prompt'>Touch two pictures that are the same in a different way.</h1>
      </div>
      `;
  },
  on_load: () => {
    // create img elements and arrange in grid as cards
    // on click they will be selected
    // can select multiple cards and deselect them
    const stimulus = store.session.get('nextStimulus');
    const numberOfCards = stimulus.distractors.length + 1;

    const jsPsychContent = document.getElementById('jspsych-content');

    // create card container
    const cardContainer = document.createElement('div');
    cardContainer.id = 'card-container';

    // create cards
    for (let i = 0; i < 7; i++) {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = `card-${i}`;

      const img = document.createElement('img');
      img.src =
        mediaAssets.images[stimulus.distractors[i]] ||
        `https://imgs.search.brave.com/wH6NX0ADUKmdx5h4d9Tho1WEpa3NBj2USMxzllhYDFc/rs:fit:860:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzAxLzk1LzcwLzUw/LzM2MF9GXzE5NTcw/NTAxM19NcW5YZFIx/dUV4dW5xazJjSldm/Z2hZbXE3ZTBwbmJz/ei5qcGc`;
      img.alt = 'stimulus';

      card.dataset.id = stimulus.distractors[i] || i;

      card.addEventListener('click', () => {
        if (card.classList.contains('selected')) {
          card.classList.remove('selected');
          selectedCards.splice(selectedCards.indexOf(card.dataset.id), 1);
        } else {
          card.classList.add('selected');
          selectedCards.push(card.dataset.id);
        }
        console.log(selectedCards);
      });

      card.appendChild(img);
      cardContainer.appendChild(card);
    }

    jsPsychContent.appendChild(cardContainer);

    // create continue button
    const continueButton = document.createElement('button');
    continueButton.id = 'continue-btn';
    continueButton.textContent = 'Continue';

    continueButton.addEventListener('click', () => {
      jsPsych.finishTrial();
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
