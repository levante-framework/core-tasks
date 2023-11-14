import jsPsychAudioButtonResponse from "@jspsych/plugin-audio-button-response";
import { mediaAssets } from "../experimentSetup";
import "../i18n";
import { storyActive } from "../config/corpus";
import "../styles/game.scss";

//@ts-check
export let storyByLabel,
  introAndInstructions,
  storyBreakList,
  practiceDone,
  blockBreaks,
  endTrial;

export function createStory() {
  function checkRowContents(content) {
    if (content.text1 === null) {
      content.text1 = "";
    }

    if (content.text2 === null) {
      content.text2 = "";
    }

    if (content.text3 === null) {
      content.text3 = "";
    }

    if (content.imageAlt === null) {
      content.imageAlt = "";
    }

    if (mediaAssets.audio[content.audioName] === undefined) {
      console.log(
        `${content.audioName} not found. Note: first letter must be lowercase.`,
      );
    }
  }

  function createScreenHtml(content) {
    if (content.screenStyle === "speechBubble") {
      return `
        <div class="lion-gif-container">
          <h1 class="speechbubble-header"> ${content.header1} </h1>
          <p class="speechbubble-text"> ${content.text1} </p>
          <p class="speechbubble-text"> ${content.text2} </p>
          <img class="roar-lion" src=${
            mediaAssets.images[content.imageName]
          } alt=${content.imageAlt}"/>
        </div>
      `;
    }
    if (content.screenStyle === "captionBelowImage") {
      return `
      <div class="gif-container">
        <h1 class="mid-centered-header" style="color:#8C1515"> ${
          content.header1
        } </h1>
        <p class="mid-centered-text" style="color:#8C1515"> ${
          content.text1
        } </p>
        <img class="device-instructions" src=${
          mediaAssets.images[content.imageName]
        } alt=${content.imageAlt}"/>
      </div>
    `;
    }
  }

  function createStoryTrial(row) {
    checkRowContents(row);
    const screenHtml = createScreenHtml(row);
    return {
      type: jsPsychAudioButtonResponse,
      stimulus: mediaAssets.audio[row.audioName],
      prompt: screenHtml,
      choices: () => ["hi"],
      button_html: () =>
        `<img class="go-button" src=${mediaAssets.images.goButton} alt="button"/>`,
    };
  }

  // Create a dictionary to store story trials indexed by label
  storyByLabel = [];

  // StoryActive is read from a csv file in config
  // note filenames for image and audio must start with a lowercase letter
  storyActive.forEach((row) => {
    const { label } = row;
    // eslint-disable-next-line no-shadow
    const storyTrial = createStoryTrial(row);

    // add entry to array
    if (!storyByLabel[label]) {
      storyByLabel[label] = [];
    }

    storyByLabel[label] = storyTrial;
  });

  //  storyByLabel contains the html for the story organized by label
  introAndInstructions = {
    morphology: {
      timeline: [
        storyByLabel.intro,
        storyByLabel.ins,
        storyByLabel.surveyPractice,
      ],
    },
    cva: {
      // cva-intro.csv does not have an "ins" row
      timeline: [storyByLabel.intro, storyByLabel.surveyPractice],
    },
  };

  storyBreakList = [];
  const initStoryBreakList = () => {
    storyBreakList.push(storyByLabel.break1);
    storyBreakList.push(storyByLabel.break2);
    storyBreakList.push(storyByLabel.break3);
    storyBreakList.push(storyByLabel.break1);
    storyBreakList.push(storyByLabel.break2);
  };

  // export const storyBreakList = [
  //   {timeline: storyByLabel["break1"]},
  //   {timeline: storyByLabel["break2"]},
  //   {timeline: storyByLabel["break3"]},
  //   {timeline: storyByLabel["break1"]},
  //   {timeline: storyByLabel["break2"]},
  // ];

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

  initStoryBreakList();
}
