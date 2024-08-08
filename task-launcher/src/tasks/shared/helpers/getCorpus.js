// Required to use top level await
import 'regenerator-runtime/runtime';
import '../../../i18n/i18n';
import _shuffle from 'lodash/shuffle';
import Papa from 'papaparse';
import _compact from 'lodash/compact';
import _toNumber from 'lodash/toNumber';
import { stringToNumberArray } from './stringToNumArray';
import { dashToCamelCase } from './dashToCamelCase';
import { camelize } from '@bdelab/roar-utils';
import { shuffleStimulusTrials } from './randomizeStimulusBlocks';
import { taskStore } from './';

export let corpora;
export const sdsPhaseCount = {}

let totalTrials = 0;

let stimulusData = [];

function writeItem(row) {
  if (row.task === 'math' && row.trial_type.includes('Number Line')) {
    const splitArr = row.item.split(',');
    return splitArr.map((el) => _toNumber(el));
  }

  return row.item;
}

function containsLettersOrSlash(str) {
  return /[a-zA-Z\/]/.test(str);
}

const transformCSV = (csvInput, numOfPracticeTrials, sequentialStimulus) => {
  let currTrialTypeBlock = '';
  let currPracticeAmount = 0;

  // Phase 1 is test-dimensions and something-same
  // Phase 2 is match and unique - subphases are either matching or test-dimensions 
  let sdsPhase1Count = 0
  let sdsPhase2aCount = 0
  let sdsPhase2bCount = 0
  let sdsPhase2cCount = 0
  let sdsPhase2dCount = 0
  let sdsPhase2eCount = 0

  csvInput.forEach((row) => {
    // Leaving this here for quick testing of a certain type of trial
    // if (!row.trial_type.includes('Number Line')) return;

    const newRow = {
      source: row.source,
      block_index: row.block_index,
      task: row.task,
      // for testing, will be removed
      prompt: row.prompt,
      item: writeItem(row),
      origItemNum: row.orig_item_num,
      trialType: row.trial_type,
      image: row?.image?.includes(',') ? row.image.split(',') : row?.image,
      timeLimit: row.time_limit,
      answer: _toNumber(row.answer) || row.answer,
      assessmentStage: row.assessment_stage,
      chanceLevel: row.chance_level,
      itemId: row.item_id,
      distractors: containsLettersOrSlash(row.response_alternatives)
        ? row.response_alternatives.split(',')
        : stringToNumberArray(row.response_alternatives),
      // difficulty: row.difficulty,
      audioFile: row.audio_file,
    };
    if (row.task === 'Mental Rotation') {
      newRow.item = camelize(newRow.item);
      newRow.answer = camelize(newRow.answer);
      newRow.distractors = newRow.distractors.map((choice) => camelize(choice));
    }

    if (row.task === 'same-different-selection') {
      newRow.requiredSelections = parseInt(row.required_selections)
      newRow.blockIndex = parseInt(row.block_index)
      // all instructions are part of phase 1
      if (((newRow.trialType.includes('something-same') || 
          newRow.trialType.includes('test-dimensions')) &&
          newRow.blockIndex < 3) ||
          newRow.trialType.includes('instructions')
      ) {
        sdsPhase1Count += 1
      } else if (newRow.trialType.includes('2-match')) {
        sdsPhase2aCount += 1
      } else if (newRow.trialType.includes('test-dimensions') && newRow.blockIndex == 4) {
        sdsPhase2bCount += 1
      } else if (newRow.trialType.includes('3-match')) {
        sdsPhase2cCount += 1
      } else if (newRow.trialType.includes('test-dimensions') && newRow.blockIndex == 5) {
        sdsPhase2dCount += 1
      } else {
        sdsPhase2eCount += 1
      }

      sdsPhaseCount.phase1 = sdsPhase1Count
      sdsPhaseCount.phase2a = sdsPhase2aCount
      sdsPhaseCount.phase2b = sdsPhase2bCount
      sdsPhaseCount.phase2c = sdsPhase2cCount
      sdsPhaseCount.phase2d = sdsPhase2dCount
      sdsPhaseCount.phase2e = sdsPhase2eCount
    }

    let currentTrialType = newRow.trialType;
    if (currentTrialType !== currTrialTypeBlock) {
      currTrialTypeBlock = currentTrialType;
      currPracticeAmount = 0;
    }

    if (newRow.assessmentStage === 'practice_response') {
      if (currPracticeAmount < numOfPracticeTrials) {
        // Only push in the specified amount of practice trials
        currPracticeAmount += 1;
        stimulusData.push(newRow);
        totalTrials += 1;
      } // else skip extra practice
    } else {
      // instruction and stimulus
      stimulusData.push(newRow);
      totalTrials += 1;
    }
  });

  if (!sequentialStimulus) {
    stimulusData = shuffleStimulusTrials(stimulusData);
  }
};

export const getCorpus = async (config) => {
  const { corpus, task, sequentialStimulus, sequentialPractice, numOfPracticeTrials } = config;

  const corpusLocation = {
    egmaMath: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    matrixReasoning: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    mentalRotation: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    sameDifferentSelection: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    trog: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    theoryOfMind: `https://storage.googleapis.com/${task}/shared/corpora/${corpus}.csv`,
    vocab: `https://storage.googleapis.com/vocab-test/shared/corpora/${corpus}.csv`,
  };

  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          transformCSV(results.data, numOfPracticeTrials, sequentialStimulus);
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
    const urls = [corpusLocation[dashToCamelCase(task)]];

    try {
      await parseCSVs(urls);
      taskStore('totalTrials', totalTrials);

    } catch (error) {
      console.error('Error:', error);
    }
  }

  await fetchData();

  const csvTransformed = {
    stimulus: stimulusData, // previously shuffled by shuffleStimulusTrials
  };

  corpora = {
    practice: csvTransformed.practice,
    stimulus: csvTransformed.stimulus,
  };

  taskStore('corpora', corpora);
};
