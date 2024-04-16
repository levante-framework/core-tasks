import store from 'store2';
import { cat, jsPsych } from '../../taskSetup';
import _isEqual from 'lodash/isEqual';
import { mediaAssets } from '../../..';
import { camelize } from '@bdelab/roar-utils';

// This function reads the corpus, calls the adaptive algorithm to select
// the next item, stores it in a session variable, and removes it from the corpus
// corpusType is the name of the subTask's corpus within corpusLetterAll[]

export const getStimulus = (corpusType) => {
  let corpus, itemSuggestion;

  corpus = store.session.get('corpora');

  itemSuggestion = cat.findNextItem(corpus[corpusType]);

  const stimAudio = itemSuggestion.nextStimulus.audioFile;

  if (stimAudio && !mediaAssets.audio[camelize(stimAudio)]) {
    console.warn('Trial skipped. Audio file not found:', stimAudio);
    store.session.set('skipCurrentTrial', true);
    // ends the setup timeline
    jsPsych.endCurrentTimeline();
  }

  // store the item for use in the trial
  store.session.set('nextStimulus', itemSuggestion.nextStimulus);

  // update the corpus with the remaining unused items
  corpus[corpusType] = itemSuggestion.remainingStimuli;
  store.session.set('corpora', corpus);

  // Testing - Slider AFC trials
  // const afcStim = corpus[corpusType].find(stim => stim.trialType === 'Number Line 4afc')
  // store.session.set("nextStimulus", afcStim);

  // Testing - 0-1 range slider trials
  // const sliderStim = corpus[corpusType].filter(stim => _isEqual(stim.item, [0,1]))
  // console.log(sliderStim)
  // store.session.set("nextStimulus", sliderStim[0]);

  // Testing - Number Comparison (2afc)
  // itemSuggestion = corpus[corpusType].find(stim => stim.trialType === 'Number Comparison')
  // store.session.set('nextStimulus', itemSuggestion);
};
