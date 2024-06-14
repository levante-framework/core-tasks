import store from 'store2';
import { cat, jsPsych } from '../../taskSetup';
import _isEqual from 'lodash/isEqual';
import { mediaAssets } from '../../..';
import { camelize } from '@bdelab/roar-utils';
import { taskStore } from './';

// This function reads the corpus, calls the adaptive algorithm to select
// the next item, stores it in a session variable, and removes it from the corpus
// corpusType is the name of the subTask's corpus within corpusLetterAll[]

export const getStimulus = (corpusType) => {
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

  // --------------------------------------------------------

  // Testing - Slider AFC trials
  // const afcStim = corpus[corpusType].find(stim => stim.trialType === 'Number Line 4afc')
  // taskStore('nextStimulus', afcStim);

  // Testing - 0-1 range slider trials
  // const sliderStim = corpus[corpusType].filter(stim => _isEqual(stim.item, [0,1]))
  // console.log(sliderStim)
  // taskStore('nextStimulus', sliderStim[0]);

  // Testing - Number Comparison (2afc)
  // itemSuggestion = corpus[corpusType].find(stim => stim.trialType === 'Number Comparison')
  // taskStore('nextStimulus', itemSuggestion);

  // // Testing - same-different-selection
  // itemSuggestion = corpus[corpusType].find(stim => stim.trialType.includes('something-same-1'))
  // taskStore('nextStimulus', itemSuggestion);
};
