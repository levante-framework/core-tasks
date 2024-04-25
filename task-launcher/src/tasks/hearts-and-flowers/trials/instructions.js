import jsPsychHTMLMultiResponse from '@jspsych-contrib/plugin-html-multi-response';
import jsPsychAudioMultiResponse from '@jspsych-contrib/plugin-audio-multi-response';
import { mediaAssets } from '../../..';
import store from 'store2';
import { jsPsych } from '../../taskSetup';
import { replayButtonSvg, overrideAudioTrialForReplayableAudio } from '../helpers/audioTrials';

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
    document.getElementsByClassName('jspsych-content-wrapper')[0].style.backgroundColor = 'red';
    const goBtn = document.getElementById('jspsych-html-multi-response-btngroup');
    goBtn.style.justifyContent = 'end';
    goBtn.style.marginRight = '1rem';
  },
  on_finish: () => (document.getElementsByClassName('jspsych-content-wrapper')[0].style.backgroundColor = 'white'),
};

// These are the instruction "trials" they are full screen with no stimulus
const instructionData = [
  {
    text: () => store.session.get('translations').heartInstruct1, // heart-instruct1: "This is the heart game. Here's how you play it."
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  {
    text: () => store.session.get('translations').flowerInstruct1, // flower-instruct1: "This is the flower game. Here's how you play."
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersPracticeTime, // hearts-and-flowers-practice-time: "Time to practice!"
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersInstruct1, // hearts-and-flowers-instruct1:	"This time the game will go faster. It won't tell you if you are right or wrong. Try to keep up!"
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.keepup,
    bottomText: () => store.session.get('translations').heartsAndFlowersEncourage1,
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersInstruct2, //hearts-and-flowers-instruct2: "Try to answer as fast as you can without making mistakes. If you make a mistake, just keep going!"
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.rocket,
    bottomText: () => store.session.get('translations').heartsAndFlowersEncourage2,
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersPlayTime, // hearts-and-flowers-play-time: "Time to play!"
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersInstruct3, // hearts-and-flowers-instruct3: "Now, we're going to play a game with hearts and flowers."
    buttonText: () => store.session.get('translations').continueButtonText || 'Continue',
    image: () => mediaAssets.images.animalWhole,
  },
  {
    text: () => store.session.get('translations').heartsAndFlowersEnd, // hearts-and-flowers-end: "Great job! You've completed the game."
    buttonText: () => store.session.get('translations').closeButtonText || 'Close',
    image: () => mediaAssets.images.animalWhole,
  },
];

//TODO: remove const and function wrapping and map directly when building the timeline
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

export function buildInstructionTrial(mascotImage, promptAudio, promptText, buttonText, bottomText=undefined) {
  const replayButtonHtmlId = 'replay-btn';
  const trial = {
    type: jsPsychAudioMultiResponse,
    stimulus: promptAudio,
    prompt:
      `<div id='stimulus-container'>
        <h1>${promptText}</h1>
        <div id='${replayButtonHtmlId}'>
          ${replayButtonSvg}
        </div>
        <div >
          <img id='instruction-graphic' src=${mascotImage} alt='Instruction graphic'/>
        </div>
        ${bottomText ? `<h2>${bottomText}</h2>` : ''}
      </div>`,
    button_choices: ['Next'],
    button_html:[
      `<button class='next-btn'>
        <p>${buttonText}</p>
      </button>`.trim(),],
    on_load: (_) => {
      const nextBtn = document.getElementById('jspsych-audio-multi-response-btngroup');
      nextBtn.style.justifyContent = 'end';
      nextBtn.style.marginRight = '1rem';
    },
  };
  overrideAudioTrialForReplayableAudio(trial, jsPsych.pluginAPI, promptAudio, replayButtonHtmlId);
  return trial;
}
