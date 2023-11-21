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

  // read the current version of the corpus
  corpus = store.session.get("corpora");

  // choose stimulus
  itemSuggestion = cat.findNextItem(corpus[corpusType]);


  // store the item for use in the trial
  store.session.set("nextStimulus", itemSuggestion.nextStimulus);

  // update the corpus with the remaining unused items
  corpus[corpusType] = itemSuggestion.remainingStimuli;
  store.session.set("corpora", corpus);
};

// This function will create a grid of blocks (x / y coordinates) based on the specified parameters. 
// The blockSize is used to determine the spacing between the blocks, both horizontally and vertically. 
// The gridSize determines the number of rows, and the number of columns is inferred from numBlocks / gridSize. 
// This assumes numBlocks is perfectly divisible by gridSize for a square grid
// export function createGrid(x, y, numBlocks, blockSize, gridSize) {
//   let blocks = [];
//   let numRows = gridSize;
//   let numCols = numBlocks / gridSize;

//   for (let row = 0; row < numRows; row++) {
//       for (let col = 0; col < numCols; col++) {
//           let blockX = x + col * blockSize;
//           let blockY = y + row * blockSize;
//           blocks.push({ x: blockX, y: blockY });
//       }
//   }

//   return blocks;
// }

export function createGrid(x, y, numBlocks, blockSize, gridSize, spacing) {
  let blocks = [];
  let numRows = gridSize;
  let numCols = numBlocks / gridSize;

  for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
          let blockX = x + col * (blockSize + spacing);
          let blockY = y + row * (blockSize + spacing);
          blocks.push({ x: blockX, y: blockY });
      }
  }

  return blocks;
}

export function generateRandomSequence(numBlocks, sequenceLength) {
  let sequence = [];

  for (let i = 0; i < sequenceLength; i++) {
    let randomNumber = Math.floor(Math.random() * (numBlocks)); 
    sequence.push(randomNumber);
  }

  return sequence;
}




