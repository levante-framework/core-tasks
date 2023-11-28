import store from "store2";
import { jsPsych } from "./jsPsych";
import { cat } from './experimentSetup'
import { mediaAssets } from "./experimentSetup";

export const shuffle = (array) => {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

export const waitFor = (conditionFunction) => {
  const poll = (resolve) => {
    if (conditionFunction()) resolve();
    // eslint-disable-next-line no-unused-vars
    else setTimeout((_) => poll(resolve), 400);
  };

  return new Promise(poll);
};

export const updateProgressBar = () => {
  const currProgressBar = jsPsych.getProgressBarCompleted();

  const totalTrials = store
    .session("stimulusCountList")
    .reduce((a, b) => a + b, 0);

  jsPsych.setProgressBar(currProgressBar + 1 / totalTrials);
};

// add an item to a list in the store, creating it if necessary
export const addItemToSortedStoreList = (tag, entry) => {
  if (!store.session.has(tag)) {
    console.warn("uninitialized store tag:" + tag);
  } else {
    // read existing list
    let sortedList = store.session(tag);

    let index = 0;
    while (index < sortedList.length && entry >= sortedList[index]) {
      index++;
    }

    // Use the splice method to insert the entry at the appropriate position
    sortedList.splice(index, 0, entry);
    store.session.set(tag, sortedList);
  }
};

export function addGlowingClass(textContent, className) {
  const container = document.querySelector(
    "#jspsych-audio-multi-response-btngroup",
  );
  const buttons = container.querySelectorAll(
    "div.jspsych-audio-multi-response-button",
  );
  console.log(buttons);
  buttons.forEach((buttonDiv) => {
    const button = buttonDiv.querySelector("button");
    if (button && button.textContent.trim() === textContent) {
      console.log(button);
      button.classList.add(className);
    }
  });
}

export function stringToBoolean(str, defaultValue = false) {
  if (str === null || str === undefined) {
    return defaultValue;
  }
  return str.trim().toLowerCase() === "true";
}

// This function reads the corpus, calls the adaptive algorithm to select
// the next item, stores it in a session variable, and removes it from the corpus
// corpusType is the name of the subTask's corpus within corpusLetterAll[]

export const getStimulus = (corpusType) => {
  let corpus, itemSuggestion;

  corpus = store.session.get("corpora");

  // choose stimulus
  itemSuggestion = cat.findNextItem(corpus[corpusType]);

  // store the item for use in the trial
  store.session.set("nextStimulus", itemSuggestion.nextStimulus);

  // update the corpus with the remaining unused items
  corpus[corpusType] = itemSuggestion.remainingStimuli;
  store.session.set("corpora", corpus);
};

export const prepareChoices = (target, distractors) => {
  // randomly select a location for the correct answer
  const randIndex = Math.floor(Math.random() * distractors.length + 1);

  // randomize the order of the distractors
  const stimulus = shuffle(distractors);
  let choices = [];
  for (let i = 0; i < distractors.length; i++) {
    choices.push(`<img src=${mediaAssets.images[stimulus[i]]} alt=${mediaAssets.images[stimulus[i]]} />`);
  }

  // insert the target
  choices.splice(randIndex, 0, `<img src=${mediaAssets.images[target]} alt=${mediaAssets.images[target]}/>`);

  store.session.set("target", target);
  store.session.set("correctResponseIndx", randIndex);
  store.session.set("choices", choices);

  return {
    target: target,
    choices: choices,
    correctResponseIndx: randIndex,
  };
};

export async function listObjects(bucketName, whitelist = {}, language, nextPageToken = '', categorizedObjects = { images: {}, audio: {}, video: {} }) {
  const baseUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o`;
  let url = baseUrl;
  if (nextPageToken) {
    url += `?pageToken=${nextPageToken}`;
  }

  const response = await fetch(url);
  const data = await response.json();

  data.items.forEach(item => {
    if (isLanguageCodeValid(item.name, language) && isWhitelisted(item.name, whitelist)) {
      const contentType = item.contentType;
      const id = item.name;
      const path = `https://storage.googleapis.com/${bucketName}/${id}`;
      const fileName = id.split('/').pop().split('.')[0];
      const camelCaseFileName = convertToCamelCase(fileName);

      if (contentType.startsWith('image/')) {
        categorizedObjects.images[camelCaseFileName] = path;
      } else if (contentType.startsWith('audio/')) {
        categorizedObjects.audio[camelCaseFileName] = path;
      } else if (contentType.startsWith('video/')) {
        categorizedObjects.video[camelCaseFileName] = path;
      }
    }
  });

  if (data.nextPageToken) {
    return listObjects(bucketName, whitelist, language, data.nextPageToken, categorizedObjects);
  } else {
    return categorizedObjects;
  }
}

// Still needs to be worked on to allow nested whitelisting (whitelisting within an already whitelisted folder)
function isWhitelisted(filePath, whitelist) {
  const parts = filePath.split('/');
  for (const [parent, children] of Object.entries(whitelist)) {
      const parentIndex = parts.indexOf(parent);
      if (parentIndex !== -1 && parts.length > parentIndex + 1) {
          const childFolder = parts[parentIndex + 1];
          if (children.includes(childFolder)) {
              return true;
          } else {
              return false; // Whitelist applies, but this folder is not allowed
          }
      }
  }
  return true; // Whitelist does not apply to this file's level
}



function isLanguageCodeValid(filePath, languageCode) {
  const parts = filePath.split('/');
  if (parts.length > 1) {
    return parts[0] === languageCode || parts[0] === 'shared';
  }
  return false;
}

function convertToCamelCase(str) {
  return str.replace(/[-_\.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^(.)/, c => c.toLowerCase());
}
