// Required to use top level await
import 'regenerator-runtime/runtime';
import '../../../i18n/i18n';
import _shuffle from 'lodash/shuffle';
import Papa from 'papaparse';
import _compact from 'lodash/compact';
import _toNumber from 'lodash/toNumber';
import { stringToNumberArray } from './stringToNumArray';
import { dashToCamelCase } from './dashToCamelCase';
import { camelize } from './camelize';
import { shuffleStimulusTrials } from './randomizeStimulusBlocks';
import { shuffleStories } from '../../roar-inference/helpers/shuffleRoarInferenceStories';
import { taskStore } from '../../../taskStore';
import { getBucketName } from './getBucketName';
import { getChildSurveyResponses } from './childSurveyResponses';

type ParsedRowType = {
  source: string;
  block_index?: string;
  blockIndex?: number;
  task: string;
  prompt: string;
  item: string | number[];
  origItemNum: string;
  orig_item_num: string;
  trialType: string;
  image: string | string[];
  timeLimit: string;
  answer: string | number;
  assessmentStage: string;
  chanceLevel: number;
  itemId: string;
  distractors: number[] | string[];
  audioFile: string | string[];
  // difficulty must be undefined to avoid running cat
  difficulty: string;
  d: string;
  trial_type: string;
  required_selections: string;
  requiredSelections?: number;
  time_limit: string;
  assessment_stage: string;
  chance_level: string;
  item_id: string;
  item_uid: string;
  response_alternatives: string;
  audio_file: string | string[];
  randomize?: string;
  trial_num: number;
  downex?: string;
};

export const sdsPhaseCount = {
  block1: 0,
  block2: 0,
  block3: 0,
  block4: 0,
  block5: 0,
  block6: 0,
};

let totalTrials = 0;
let totalDownexTrials = 0;

let stimulusData: StimulusType[] = [];

function writeItem(row: ParsedRowType) {
  if (row.task === 'math' && row.trial_type.includes('Number Line')) {
    const splitArr = (row.item as string).split(',');
    return splitArr.map((el) => _toNumber(el));
  }

  return row.item;
}

function containsLettersOrSlash(str: string) {
  return /[a-zA-Z\/]/.test(str);
}

const transformCSV = (
  csvInput: ParsedRowType[],
  numOfPracticeTrials: number,
  sequentialStimulus: boolean,
  task: string,
) => {
  let currTrialTypeBlock = '';
  let currPracticeAmount = 0;

  // Phase 1 is test-dimensions and something-same
  // Phase 2 is match and unique - subphases are either matching or test-dimensions
  let sdsBlock1Count = 0;
  let sdsBlock2Count = 0;
  let sdsBlock3Count = 0;
  let sdsBlock4Count = 0;
  let sdsBlock5Count = 0;
  let sdsBlock6Count = 0;

  csvInput.forEach((row) => {
    // Leaving this here for quick testing of a certain type of trial
    // if (!row.trial_type.includes('Number Line')) return;

    const newRow: StimulusType = {
      source: row.source,
      block_index: row.block_index,
      task: row.task,
      // for testing, will be removed
      prompt: row.prompt,
      item: writeItem(row),
      origItemNum: row.orig_item_num,
      trialType: row.trial_type,
      image: row?.image?.includes(',') ? (row.image as string).split(',') : row?.image,
      timeLimit: row.time_limit,
      answer: _toNumber(row.answer) || row.answer,
      assessmentStage: row.assessment_stage,
      chanceLevel: _toNumber(row.chance_level),
      itemId: row.item_id,
      itemUid: row.item_uid,
      distractors: (() => {
        if (row.task === 'roar-inference') {
          return row.response_alternatives.split(',').map((alt) => alt.replace(/"/g, ''));
        } else if (row.task === 'child-survey') {
          return getChildSurveyResponses();
        }
        else {
          return containsLettersOrSlash(row.response_alternatives) ||
            (row.task === 'adult-reasoning' && row.response_alternatives.includes(';'))
            ? row.response_alternatives.split(',')
            : stringToNumberArray(row.response_alternatives);
        }
      })(),
      audioFile: row.audio_file?.includes(',') ? (row.audio_file as string).split(',') : row.audio_file as string,
      // difficulty must be undefined for non-instruction/practice trials to avoid running cat
      difficulty:
        taskStore().runCat || row.trial_type === 'instructions' || row.assessment_stage === 'practice_response'
          ? parseFloat(row.d || row.difficulty)
          : NaN,
      randomize: row.randomize as 'yes' | 'no' | 'at_block_level',
      trialNumber: row.trial_num,
      downex: row.downex?.toUpperCase() === 'TRUE',
    };

    if (row.task === 'Mental Rotation') {
      newRow.item = camelize(newRow.item as string);
      newRow.answer = camelize(newRow.answer as string);
      newRow.distractors = (newRow.distractors as string[]).map((choice) => camelize(choice));
    }

    if (row.task === 'same-different-selection') {
      newRow.requiredSelections = parseInt(row.required_selections);
      newRow.blockIndex = parseInt(row.block_index || '');
      // all instructions are part of phase 1
      if (newRow.blockIndex == 1) {
        sdsBlock1Count += 1;
      } else if (newRow.blockIndex == 2) {
        sdsBlock2Count += 1;
      } else if (newRow.blockIndex == 3) {
        sdsBlock3Count += 1;
      } else if (newRow.blockIndex == 4) {
        sdsBlock4Count += 1;
      } else if (newRow.blockIndex == 5) {
        sdsBlock5Count += 1;
      } else {
        sdsBlock6Count += 1;
      }

      sdsPhaseCount.block1 = sdsBlock1Count;
      sdsPhaseCount.block2 = sdsBlock2Count;
      sdsPhaseCount.block3 = sdsBlock3Count;
      sdsPhaseCount.block4 = sdsBlock4Count;
      sdsPhaseCount.block5 = sdsBlock5Count;
      sdsPhaseCount.block6 = sdsBlock6Count;
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
    } else if (newRow.downex) {
      if (taskStore().heavyInstructions) {
        stimulusData.push(newRow);
        totalDownexTrials += 1;
      }
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

export const getCorpus = async (config: Record<string, any>, isDev: boolean) => {
  const { corpus, task, sequentialStimulus, numOfPracticeTrials } = config;

  const bucketName = getBucketName(task, isDev, 'corpus');

  const corpusUrl = `https://storage.googleapis.com/${bucketName}/${corpus}.csv?alt=media&v=2`;

  function downloadCSV(url: string) {
    return new Promise((resolve, reject) => {
      Papa.parse<ParsedRowType>(url, {
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

  async function parseCSVs(urls: string[]) {
    const promises = urls.map((url, i) => downloadCSV(url));
    return Promise.all(promises);
  }

  async function fetchData() {
    const urls = [corpusUrl];
    try {
      await parseCSVs(urls);
      taskStore('totalTrials', totalTrials);
      taskStore('totalDownexTrials', totalDownexTrials);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  await fetchData();

  const csvTransformed = {
    stimulus: stimulusData, // previously shuffled by shuffleStimulusTrials
  };

  taskStore('corpora', csvTransformed);
};
