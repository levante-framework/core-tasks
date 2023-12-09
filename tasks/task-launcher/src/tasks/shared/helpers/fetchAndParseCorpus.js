import i18next from "i18next";
import "../../../i18n/i18n";
import _shuffle from 'lodash/shuffle'
import Papa from "papaparse";
import _compact from 'lodash/compact'
import _toNumber from 'lodash/toNumber'
import store from "store2";
import "regenerator-runtime/runtime";
import { stringToNumberArray } from "./stringToNumArray";

export let corpora

let maxStimlulusTrials = 0;
let maxPracticeTrials = 0

let stimulusData = [], practiceData = []

function writeItem(row) {
  // console.log(row.task)
  if (row.task.includes('Number Line')) {
    // console.log(row.item)
    const splitArr = row.item.split(",")
    // console.log(splitArr)
    return splitArr.map(el => _toNumber(el))
  }

  return row.item
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
      timeLimit: row.time_limit,
      answer: _toNumber(row.answer),
      notes: row. notes,
      distractors: stringToNumberArray(row.response_alternatives),
      difficulty: row.difficulty
    };
    
    // if (newRow.task.includes('Number Line')) {
      // console.log('after parsing: ', newRow.item)
    // }


    if (row.notes === 'practice') {
      practiceData.push(newRow)
      maxPracticeTrials += 1
    } else {
      stimulusData.push(newRow)
      maxStimlulusTrials += 1
    }
  });
}


export const fetchAndParseCorpus = async (config) => {
  const { corpus, task, storyCorpus, story, sequentialStimulus, sequentialPractice, numOfPracticeTrials } = config

  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          transformCSV(results.data);
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
      `https://storage.googleapis.com/${task}/${i18next.language}/corpora/${corpus}.csv`,
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