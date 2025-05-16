import _isEqual from 'lodash/isEqual';
import { mediaAssets } from '../../..';
import { camelize } from './camelize';
import { taskStore } from '../../../taskStore';
import { cat, jsPsych } from '../../taskSetup';

// This function reads the corpus, calls the adaptive algorithm to select
// the next item, stores it in a session variable, and removes it from the corpus
// corpusType is the name of the subTask's corpus within corpusLetterAll[]

export const getStimulus = (corpusType: string, blockNumber?: number) => {
  let corpus, itemSuggestion;

  corpus = taskStore().corpora;

  // if block number is specified, get next item from only the indicated block of the corpus
  blockNumber != undefined
    ? (itemSuggestion = cat.findNextItem(corpus[corpusType][blockNumber]))
    : (itemSuggestion = cat.findNextItem(corpus[corpusType]));

  const stimAudio = itemSuggestion.nextStimulus.audioFile;
  if (stimAudio && !mediaAssets.audio[camelize(stimAudio)]) {
    console.warn('Trial skipped. Audio file not found:', stimAudio);
    taskStore('skipCurrentTrial', true);
    // ends the setup timeline
    jsPsych.endCurrentTimeline();
  }

  // store the item for use in the trial
  taskStore('nextStimulus', itemSuggestion.nextStimulus);

  if (
    itemSuggestion.nextStimulus.assessmentStage === 'practice_response'
  ) {
    taskStore('testPhase', false);
  }

  // update the corpus with the remaining unused items
  blockNumber != undefined
    ? (corpus[corpusType][blockNumber] = itemSuggestion.remainingStimuli)
    : (corpus[corpusType] = itemSuggestion.remainingStimuli);

  taskStore('corpora', corpus);
};
