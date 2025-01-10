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
import {shuffleStories} from '../../roar-inference/helpers/shuffleRoarInferenceStories'
import { taskStore } from '../../../taskStore';

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

const transformCSV = (csvInput, numOfPracticeTrials, sequentialStimulus, task) => {
  let currTrialTypeBlock = '';
  let currPracticeAmount = 0;

  // Phase 1 is test-dimensions and something-same
  // Phase 2 is match and unique - subphases are either matching or test-dimensions 
  let sdsBlock1Count = 0
  let sdsBlock2Count = 0
  let sdsBlock3Count = 0
  let sdsBlock4Count = 0
  let sdsBlock5Count = 0
  let sdsBlock6Count = 0

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
      chanceLevel: _toNumber(row.chance_level),
      itemId: row.item_id,
      distractors: (() => {
        if (row.task === 'roar-inference') {
          return row.response_alternatives.split(',').map((alt) => alt.replace(/"/g, ''));
        } else {
          return containsLettersOrSlash(row.response_alternatives)
            ? row.response_alternatives.split(',')
            : stringToNumberArray(row.response_alternatives);
        }
      })(),
      audioFile: row.audio_file,
      // difficulty must be undefined for non-instruction/practice trials to avoid running cat
      difficulty: (taskStore().runCat || 
      row.trial_type === 'instructions' ||
      row.assessment_stage === 'practice-response') ? 
      parseFloat(row.d || row.difficulty) : NaN,
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
      if (newRow.blockIndex == 1) {
        sdsBlock1Count += 1
      } else if (newRow.blockIndex == 2) {
        sdsBlock2Count += 1
      } else if (newRow.blockIndex == 3) {
        sdsBlock3Count += 1
      } else if (newRow.blockIndex == 4) {
        sdsBlock4Count += 1
      } else if (newRow.blockIndex == 5) {
        sdsBlock5Count += 1
      } else {
        sdsBlock6Count += 1
      }

      sdsPhaseCount.block1 = sdsBlock1Count
      sdsPhaseCount.block2 = sdsBlock2Count
      sdsPhaseCount.block3 = sdsBlock3Count
      sdsPhaseCount.block4 = sdsBlock4Count
      sdsPhaseCount.block5 = sdsBlock5Count
      sdsPhaseCount.block6 = sdsBlock6Count
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

  if (task === 'roar-inference') {
    const inferenceNumStories = taskStore().inferenceNumStories;
    const numItemsPerStory = taskStore().stimulusBlocks;
    const notStoryTypes = ['introduction', 'practice'];
    stimulusData = shuffleStories(stimulusData, inferenceNumStories, 'item', notStoryTypes, numItemsPerStory);
    return;
  }

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
    roarInference: `https://storage.googleapis.com/roar-inference/en/corpora/${corpus}.csv`,
  };

  function downloadCSV(url, i) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          transformCSV(results.data, numOfPracticeTrials, sequentialStimulus, task);
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
