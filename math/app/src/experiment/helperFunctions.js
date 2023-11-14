import store from "store2";
import { jsPsych } from "./jsPsych";

export const shuffle = (array) => {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    // use "destructuring assignment" syntax
    // eslint-disable-next-line no-param-reassign
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

export const getGrade = (inputGrade, gradeMin = 0, gradeMax = 12) => {
  const parsedGrade = Number(inputGrade);
  let grade;

  if (Number.isNaN(parsedGrade)) {
    // Assume grade is K, TK, or PK
    grade = gradeMin;
  } else if (parsedGrade < gradeMin) {
    grade = gradeMin;
  } else if (parsedGrade > gradeMax) {
    grade = gradeMax;
  } else {
    // grade is within range and is a number
    grade = parsedGrade;
  }

  return grade;
};
