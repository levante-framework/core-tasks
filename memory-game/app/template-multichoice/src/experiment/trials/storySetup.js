import jsPsychAudioButtonResponse from "@jspsych/plugin-audio-button-response";
import { mediaAssets } from "../experimentSetup";
import "../i18n";
import { corpora } from "../config/corpus";

//@ts-check
export let storyByLabel,
  introAndInstructions,
  storyBreakList,
  practiceDone,
  blockBreaks,
  endTrial;

export function createStory() {

  function createHTML(content) {
    return (`
      <div class="prompt-container">
        <h1 class="prompt-header"> ${content.header} </h1>
        <p class="prompt-top-text"> ${content.topText} </p>
        <img class="task-graphic" src=${mediaAssets.images[content.imageName]} alt=${content.imageAlt}"/>
        <p class="prompt-bottom-text"> ${content.bottomText} </p>
      </div>
    `);
  }

  function createStoryTrial(row) {
    
    return {
      type: jsPsychAudioButtonResponse,
      stimulus: mediaAssets.audio[row.audioName],
      prompt: createHTML(row),
      choices: () => ["hi"],
      button_html: () =>
        `<img class="go-button" src=${mediaAssets.images.goButton} alt="button"/>`,
    };
  }

  // Create a dictionary to store story trials indexed by label
  storyByLabel = {};


  // note filenames for image and audio must start with a lowercase letter
  corpora.story.forEach((row) => {
    const { trialName } = row;
    const storyTrial = createStoryTrial(row);

    storyByLabel[trialName] = storyTrial;
  });


  introAndInstructions = {
    timeline: [
      storyByLabel.intro,
      storyByLabel.ins,
      storyByLabel.surveyPractice,
    ],
  };

  storyBreakList = [
    storyByLabel.break1,
    storyByLabel.break2,
    storyByLabel.break3,
    storyByLabel.break1,
    storyByLabel.break2
  ];

  practiceDone = {
    timeline: [storyByLabel.surveyPostPractice],
  };

  blockBreaks = {
    timeline: [
      storyByLabel.break1,
      storyByLabel.break2,
      storyByLabel.break3,
      storyByLabel.break4,
      storyByLabel.break5,
    ],
  };

  endTrial = {
    timeline: [storyByLabel.ending],
  };
}
