import jsPsychAudioButtonResponse from "@jspsych/plugin-audio-button-response";
import { mediaAssets } from "../experimentSetup";
import "../i18n";
import i18next from "i18next";

// Will probably switch to using Locize for storing translations

//@ts-check
export let storyByLabel,
  introAndInstructions,
  storyBreakList,
  practiceDone,
  endTrial;

  const instructionData = {
    intro: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'intro'
    },
    instructions: {
      image: 'clickButton',
      imageAlt: 'Mouse pressing',
      audio: 'ins'
    },
    practice: {
      image: 'clickButton',
      imageAlt: 'Mouse pressing',
      audio: 'surveyPractice'
    },
    postPractice: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'surveyPostPractice'
    },
    practiceCorrect: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'thatsRight'
    },
    break1: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'break1'
    },
    break2: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'break2'
    },
    break3: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'break3'
    },
    break4: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'break4'
    },
    break5: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'break5'
    },
    ending: {
      image: 'rOARLion',
      imageAlt: 'ROAR Lion',
      audio: 'ending'
    },
  }

export function createStory() {    
  const instructions = {}
  
  for (const [trialName, trialData] of Object.entries(instructionData)) {
    instructions[trialName] = {
      type: jsPsychAudioButtonResponse,
      stimulus: mediaAssets.audio[trialData.audio],
      prompt: () => `
      <div class="prompt-container">
        <h1 class="prompt-header"> ${i18next.t(`instructions.${trialName}.header`)} </h1>
        <p class="prompt-top-text"> ${i18next.t(`instructions.${trialName}.topText`)} </p>
        <img class="task-graphic" src=${mediaAssets.images[trialData.image]} alt=${mediaAssets.images[trialData.imageAlt]}"/>
        <p class="prompt-bottom-text"> ${i18next.t(`instructions.${trialName}.bottomText`)} </p>
      </div>
    `,
      choices: () => ["hi"],
      button_html: () =>
        `<img class="go-button" src=${mediaAssets.images.goButton} alt="button"/>`,
    };
  }
  
  introAndInstructions = {
    timeline: [
      instructions.intro,
      instructions.instructions,
      instructions.practice,
    ],
  };
  
  storyBreakList = [
    instructions.break1,
    instructions.break2,
    instructions.break3,
    instructions.break1,
    instructions.break2
  ];
  
  practiceDone = {
    timeline: [instructions.postPractice],
  };
  
  endTrial = {
    timeline: [instructions.ending],
  };
}
