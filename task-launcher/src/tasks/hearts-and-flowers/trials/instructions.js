import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';

export const introduction = {
  type: jsPsychHTMLMultiResponse,
  stimulus: () => {
    return `<div >
            <h1 id="header">Hearts and Flowers Game</h1>
            <div >
                <img id='instruction-graphic' src=${mediaAssets.images.animalWhole} alt='Gray bear'/>
            </div>
        </div>`;
  },
  button_choices: ['Go'],
  button_html: [
    `
        <button class='go-btn'>
            <p>Go</p>
        </button>`,
  ],
  on_load: () => {
    document.getElementById('jspsych-content').style.backgroundColor = 'red';
    const goBtn = document.getElementById('jspsych-html-multi-response-btngroup');
    goBtn.style.justifyContent = 'end';
    goBtn.style.marginRight = '1rem';
  },
  on_finish: () => (document.getElementById('jspsych-content').style.backgroundColor = 'white'),
};

const instructionData = [
  {
    text: () => store.session.get('translations').heartInstruct1,
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  {
    text: () => store.session.get('translations').flowerInstruct1,
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  { text: () => store.session.get('translations').heartsAndFlowersPracticeTime, 
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue', 
    image: () => mediaAssets.images.animalWhole 
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersInstruct1,
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.keepup,
    bottomText: 'Try to Keep up!',
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersInstruct2,
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.rocket,
    bottomText: 'If you make a mistake, just keep going!',
  },
  { 
    text: () => store.session.get('translations').heartsAndFlowersPlayTime,
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue', 
    image: () => mediaAssets.images.animalWhole },
  {
    text: () => store.session.get('translations').heartsAndFlowersInstruct3,
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  { 
    text: 'Great job! You completed the game!.', 
    buttonText: 'Close', 
    image: () => mediaAssets.images.animalWhole 
  },
];

export const [
  heartInstructions,
  flowerInstructions,
  timeToPractice,
  keepUp,
  keepGoing,
  timeToPlay,
  heartsAndFlowers,
  endGame,
] = instructionData.map((data) => {
  return {
    type: jsPsychHTMLMultiResponse,
    stimulus: () => {
      return `<div id='stimulus-container'>
                    <h1>${typeof data.text === 'function' ? data.text() : data.text}</h1>
                    <div >
                        <img id='instruction-graphic' src=${data.image()} alt='Instruction graphic'/>
                    </div>
                    ${data.bottomText ? `<h2>${data.bottomText}</h2>` : ''}
                </div>`;
    },
    button_choices: ['Next'],
    button_html: () => [
      `<button class='next-btn'>
                    <p>${typeof data.buttonText === 'function' ? data.buttonText() : data.buttonText}</p>
                </button>`,
    ],
    on_load: () => {
      const nextBtn = document.getElementById('jspsych-html-multi-response-btngroup');
      nextBtn.style.justifyContent = 'end';
      nextBtn.style.marginRight = '1rem';
    },
  };
});
