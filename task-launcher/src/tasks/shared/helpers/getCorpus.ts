// Required to use top level await
import 'regenerator-runtime/runtime';
// @ts-ignore
import { camelize } from '@bdelab/roar-utils';
import '../../../i18n/i18n';
import * as Papa from 'papaparse';
import { toNumber } from 'lodash';
import { stringToNumberArray } from './stringToNumArray';
import { dashToCamelCase } from './dashToCamelCase';
import { shuffleStimulusTrials, TransformedRowType } from './randomizeStimulusBlocks';
import { taskStore } from '.';

interface RowDataType {
  task: string;
  trial_type: string;
  item: string;
  source: string;
  block_index: number;
  orig_item_num: number;
  prompt: string;
  image: string;
  time_limit: number;
  answer: number | string;
  response_alternatives: string;
  notes: string;
  audio_file: string;
  required_selections: string;
  same_different: string;
  affix: string;
};

type SdsPhaseCountType = {
  phase1?: number;
  phase2?: number;
}

export let corpora: {
  stimulus: TransformedRowType[];
};
export const sdsPhaseCount: SdsPhaseCountType = {}

let totalTrials = 0;

let stimulusData: Array<TransformedRowType> = [];

function writeItem(row: RowDataType) {
  if (row.task === 'math' && row.trial_type.includes('Number Line')) {
    const splitArr = row.item.split(',');
    return splitArr.map((el) => toNumber(el));
  }

  return row.item;
}

function containsLettersOrSlash(str: string) {
  return /[a-zA-Z\/]/.test(str);
}

const transformCSV = (csvInput: RowDataType[], numOfPracticeTrials: number, sequentialStimulus: boolean) => {
  let currTrialTypeBlock = '';
  let currPracticeAmount = 0;

  // Phase 1 is test-dimensions and something-same
  // Phase 2 is match and unique
  let sdsPhase1Count = 0
  let sdsPhase2Count = 0

  csvInput.forEach((row: RowDataType) => {
    // Leaving this here for quick testing of a certain type of trial
    // if (!row.trial_type.includes('Number Line')) return;

    const newRow: TransformedRowType = {
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
      answer: toNumber(row.answer) || row.answer,
      notes: row.notes,
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
      newRow.sameDifferent = row.same_different,
      newRow.affix = row.affix

      if (newRow.trialType.includes('something-same') || 
          newRow.trialType.includes('test-dimensions')
      ) {
        sdsPhase1Count += 1
      } else {
        sdsPhase2Count += 1
      }

      sdsPhaseCount.phase1 = sdsPhase1Count
      sdsPhaseCount.phase2 = sdsPhase2Count
    }

    let currentTrialType = newRow.trialType;
    if (currentTrialType !== currTrialTypeBlock) {
      currTrialTypeBlock = currentTrialType;
      currPracticeAmount = 0;
    }

    if (newRow.notes === 'practice') {
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

export const getCorpus = async (config: Record<string, any>) => {
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

  function downloadCSV(url: string) {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results: { data: any }) {
          transformCSV(results.data, numOfPracticeTrials, sequentialStimulus);
          resolve(results.data);
        },
        error: function (error) {
          reject(error);
        },
      });
    });
  }

  async function parseCSVs(urls: string[]) {
    const promises = urls.map((url) => downloadCSV(url));
    return Promise.all(promises);
  }

  async function fetchData() {
    const camelCasedTask = dashToCamelCase(task) as keyof typeof corpusLocation;
    const urls = [corpusLocation[camelCasedTask]];

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
    // practice: csvTransformed.practice,
    stimulus: csvTransformed.stimulus,
  };

  taskStore('corpora', corpora);
};
