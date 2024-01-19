import i18next from "i18next";
import "../../../i18n/i18n";
import _shuffle from 'lodash/shuffle'
import Papa from "papaparse";
import _compact from 'lodash/compact'
import _toNumber from 'lodash/toNumber'
import store from "store2";
import "regenerator-runtime/runtime";
import { stringToNumberArray } from "./stringToNumArray";
import { dashToCamelCase } from "./dashToCamelCase";
import { camelize } from "@bdelab/roar-utils";


export let corpora

let maxStimlulusTrials = 0;
let maxPracticeTrials = 0

let stimulusData = [], practiceData = []

function writeItem(row) {
  if (row.task.includes('Number Line')) {
    const splitArr = row.item.split(",")
    return splitArr.map(el => _toNumber(el))
  }

  return row.item
}

function containsLetters(str) {
  return /[a-zA-Z]/.test(str);
}

const transformCSV = (csvInput) => {
  csvInput.forEach((row) => {
    const newRow = {
      source: row.source,
      block_index: row.block_index,
      task: row.task,
      // for testing, will be removed 
      prompt: row.prompt,
      item: writeItem(row),
      trialType: row.trial_type,
      image: row.image,
      timeLimit: row.time_limit,
      answer: _toNumber(row.answer) || row.answer,
      notes: row.notes,
      distractors: containsLetters(row.response_alternatives) ? row.response_alternatives.split(',') : stringToNumberArray(row.response_alternatives),
      difficulty: row.difficulty
    };

    if (row.task === 'Mental Rotation') {
      newRow.item = camelize(newRow.item)
      newRow.answer = camelize(newRow.answer)
      newRow.distractors = newRow.distractors.map(choice => camelize(choice))
    }


    if (row.notes === 'practice') {
      practiceData.push(newRow)
      maxPracticeTrials += 1
    } else {
      stimulusData.push(newRow)
      maxStimlulusTrials += 1
    }
  });
  // console.log(stimulusData)
}


export const fetchAndParseCorpus = async (config) => {
  const { 
    corpus, 
    task, 
    sequentialStimulus, 
    sequentialPractice, 
    numOfPracticeTrials
  } = config
  
  const corpusLocation = {
    egmaMath: `https://storage.googleapis.com/${task}/${i18next.language}/corpora/${corpus}.csv`,
    matrixReasoning: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    mentalRotation: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    sameDifferentSelection: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    trog: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    theoryOfMind: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
  }

  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          transformCSV(results.data);
          // console.log({stimulusData, practiceData})
          resolve(results.data);
        },
        error: function (error) {
          reject(error);
        },
      });
    });
  }

  async function parseCSVs(urls) {
    const promises = urls.map((url, i) => downloadCSV(url, i));
    return Promise.all(promises);
  }

  async function fetchData() {
    const urls = [
      corpusLocation[dashToCamelCase(task)],
    ];

    try {
      await parseCSVs(urls);
      store.session.set("maxStimulusTrials", maxStimlulusTrials);

      if (numOfPracticeTrials > maxPracticeTrials) config.numOfPracticeTrials = maxPracticeTrials 

      store.session.set('config', config)
    } catch (error) {
      console.error("Error:", error);
    }
  }

  await fetchData();

  const csvTransformed = {
    practice: sequentialPractice ? practiceData : _shuffle(practiceData),
    stimulus: sequentialStimulus ? stimulusData : _shuffle(stimulusData),
  };

  corpora = {
    practice: csvTransformed.practice,
    stimulus: csvTransformed.stimulus,
  };

  // console.log({corpora})

  store.session.set("corpora", corpora);
}