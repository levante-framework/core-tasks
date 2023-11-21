import i18next from "i18next";
import "../i18n";
// import { multichoiceCorpus } from "../i18n";
import { shuffle } from "../helperFunctions";
import Papa from "papaparse";
import _compact from 'lodash/compact'
import store from "store2";
import "regenerator-runtime/runtime";

export let corpora, storyActive;

let maxStimlulusTrials = 0;

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
    newRow.distractors = _compact([newRow.distractor1, newRow.distractor2, newRow.distractor3]),
    accum.push(newRow);
    if (!isPractice) maxStimlulusTrials += 1;
    return accum;
  }, []);
}

export async function loadCorpus(
  practiceCorpus,
  stimulusCorpus,
  sequentialPractice,
  sequentialStimulus,
) {
  // const currentTask = store.session.get("config").task;
  // const csvAssets = {
  //   // storyLion: multichoiceCorpus[i18next.language].storyLion,
  //   storyLion: multichoiceCorpus[i18next.language].task[currentTask],
  // };

  let practice, stimulus;

  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          if (i === 0) {
            practice = transformCSV(results.data, true);
          } else {
            stimulus = transformCSV(results.data, false);
          }
          resolve(results.data);
        },
        error: function (error) {
          reject(error);
        },
      });
    });
  }

  async function parseMultipleCSVs(urls) {
    const promises = urls.map((url, i) => downloadCSV(url, i));
    return Promise.all(promises);
  }

  async function fetchData() {
    const urls = [
      // lang (en) will be dynamic
      `https://storage.googleapis.com/egma-math/en/corpora/${practiceCorpus}.csv`,
      `https://storage.googleapis.com/egma-math/en/corpora/${stimulusCorpus}.csv`,
    ];

    try {
      await parseMultipleCSVs(urls);
      store.session.set("maxStimulusTrials", maxStimlulusTrials);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  await fetchData();

  // const transformStoryCSV = (csvInput) =>
  //   csvInput.reduce((accum, row) => {
  //     const newRow = {
  //       label: row.label,
  //       screenStyle: row.screenStyle,
  //       imageName: row.imageName,
  //       imageAlt: row.imageAlt,
  //       audioName: row.audioName,
  //       audioGap: row.audioGap,
  //       buttonName: row.buttonName,
  //       duration: row.duration,
  //       header1: row.header1,
  //       text1: row.text1,
  //       text2: row.text2,
  //     };
  //     accum.push(newRow);
  //     return accum;
  //   }, []);

  const csvTransformed = {
    practice: sequentialPractice ? practice : shuffle(practice),
    stimulus: sequentialStimulus ? stimulus : shuffle(stimulus),
    // storyROARLion: transformStoryCSV(csvAssets.storyLion),
  };

  corpora = {
    practice: csvTransformed.practice,
    stimulus: csvTransformed.stimulus,
    // story: csvTransformed.storyROARLion,
  };

  // console.log({corpora})


  // Introduction & Story
  // const storyAll = {
  //   name: "corpusStory",
  //   corpusStory: csvTransformed.storyROARLion,
  // };

  // future: set storyActive to the desired story
  // storyActive = storyAll.corpusStory;
}
