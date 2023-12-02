import i18next from "i18next";
import "../../../i18n/i18n";
import { shuffle } from "./shuffle";
import Papa from "papaparse";
import _compact from 'lodash/compact'
import store from "store2";
import "regenerator-runtime/runtime";

export let corpora

let maxStimlulusTrials = 0;
let maxPracticeTrials = 0

const transformCSV = (csvInput, isPractice) => {
  return csvInput.reduce((accum, row) => {
    const newRow = {
      item: row.item || row.Item,
      target: row.target || row.Target || row.answer || row.Answer,
      distractor1: row.distractor1 || row.Distractor1 || row.distractor_1,
      distractor2: row.distractor2 || row.Distractor2 || row.distractor_2,
      distractor3: row.distractor3 || row.Distractor3 || row.distractor_3,
      difficulty: isPractice ? row.difficulty : row.b,
      prompt: row.prompt,
      source: row.source
    };
    // Array of distractors with falsey and empty string values removed
    newRow.distractors = _compact([newRow.distractor1, newRow.distractor2, newRow.distractor3]),

    accum.push(newRow);

    if (!isPractice) {
      maxStimlulusTrials += 1;
    } else {
      maxPracticeTrials += 1
    }

    return accum;
  }, []);
}


export const fetchAndParseCorpus = async (config) => {
  const { practiceCorpus, stimulusCorpus, task, storyCorpus, story, sequentialPractice, sequentialStimulus, numOfPracticeTrials } = config

  let practiceData, stimulusData

  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          if (i === 0) {
            practiceData = transformCSV(results.data, true);
          } else if (i == 1) {
            stimulusData = transformCSV(results.data, false);
          }

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
      `https://storage.googleapis.com/${task}/${i18next.language}/corpora/${practiceCorpus}.csv`,
      `https://storage.googleapis.com/${task}/${i18next.language}/corpora/${stimulusCorpus}.csv`,
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
    practice: sequentialPractice ? practiceData : shuffle(practiceData),
    stimulus: sequentialStimulus ? stimulusData : shuffle(stimulusData),
  };

  corpora = {
    practice: csvTransformed.practice,
    stimulus: csvTransformed.stimulus,
  };

  store.session.set("corpora", corpora);
}