import store from "store2";
import { jsPsych } from "./jsPsych";
import { cat } from './experimentSetup'

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
    choices.push(stimulus[i]);
  }

  // insert the target
  choices.splice(randIndex, 0, target);

  store.session.set("target", target);
  store.session.set("correctResponseIndx", randIndex);
  store.session.set("choices", choices);

  return {
    target: target,
    choices: choices,
    correctResponseIndx: randIndex,
  };
};

async function fetchFolderContents(bucketName, folderPath = '') {
  const encodedFolderPath = encodeURIComponent(folderPath).replace(/%2F/g, '/');
  // ?prefix=${encodedFolderPath}&delimiter=/
  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?maxResults=1000`;
  
  try {
      const response = await fetch(url);
      console.log({response})
      const data = await response.json();
      console.log({data})
      return data.items || [];
  } catch (error) {
      console.error('Error fetching folder contents:', error);
      return [];
  }
}

function shouldProcessFolder(folderName, whitelist, nestingLevel) {
  // Implement logic based on whitelist and nestingLevel
  // Example: return whitelist[nestingLevel].includes(folderName);
}



export async function generateAssetObject(bucketURI, bucketName, whitelist = {}, includeShared = true) {
  let assets = { images: {}, video: {}, audio: {} };

  async function handleFolder(folderPath, nestingLevel = 0) {
      const contents = await fetchFolderContents(bucketName, folderPath);
      console.log({contents})

      contents.forEach(item => {
          if (item.type === 'folder') {
              if (shouldProcessFolder(item.name, nestingLevel)) {
                  handleFolder(item.path, nestingLevel + 1);
              }
          } else if (item.type === 'file') {
              processFile(item);
          }
      });
  }

  function shouldProcessFolder(folderName, nestingLevel) {
      // Implement logic to decide if the folder should be processed
      // based on whitelist and nestingLevel
  }

  function processFile(file) {
      const parsedFileName = path.parse(file.name).name;
      const camelizedFileName = camelize(parsedFileName);
      const fileURL = `${bucketURI}/${file.path}`;
      
      const assetType = getAssetType(file.path);
      assets[assetType][camelizedFileName] = fileURL;
  }

  // Start processing from the top-level directory
  await handleFolder('');

  return assets;
}

