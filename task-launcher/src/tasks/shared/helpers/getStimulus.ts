import _isEqual from 'lodash/isEqual';
import { mediaAssets } from '../../..';
import { camelize } from './camelize';
import { taskStore } from '../../../taskStore';
import { cat, jsPsych } from '../../taskSetup';

// This function reads the corpus, calls the adaptive algorithm to select
// the next item, stores it in a session variable, and removes it from the corpus
// corpusType is the name of the subTask's corpus within corpusLetterAll[]

export const getStimulus = (corpusType: string) => {
  let corpus, itemSuggestion;

  corpus = taskStore().corpora;

  itemSuggestion = cat.findNextItem(corpus[corpusType]);

  const stimAudio = itemSuggestion.nextStimulus.audioFile;
  if (stimAudio && !mediaAssets.audio[camelize(stimAudio)]) {
    console.warn('Trial skipped. Audio file not found:', stimAudio);
    taskStore('skipCurrentTrial', true);
    // ends the setup timeline
    jsPsych.endCurrentTimeline();
  }

  // store the item for use in the trial
  taskStore('nextStimulus', itemSuggestion.nextStimulus);

  // update the corpus with the remaining unused items
  corpus[corpusType] = itemSuggestion.remainingStimuli;
  taskStore('corpora', corpus);
};
