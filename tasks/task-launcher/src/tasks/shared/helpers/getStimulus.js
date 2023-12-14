import store from "store2";
import { cat } from "../../taskSetup";

// This function reads the corpus, calls the adaptive algorithm to select
// the next item, stores it in a session variable, and removes it from the corpus
// corpusType is the name of the subTask's corpus within corpusLetterAll[]

export const getStimulus = (corpusType) => {
  let corpus, itemSuggestion;

  corpus = store.session.get("corpora");

  // itemSuggestion = cat.findNextItem(corpus[corpusType]);

  // // store the item for use in the trial
  // store.session.set("nextStimulus", itemSuggestion.nextStimulus);

  // // update the corpus with the remaining unused items
  // corpus[corpusType] = itemSuggestion.remainingStimuli;
  // store.session.set("corpora", corpus);

  const afcStim = corpus[corpusType].find(stim => stim.task === 'Number Line 4afc') 

  store.session.set("nextStimulus", afcStim);
};