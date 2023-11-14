/* eslint-disable prefer-const */
/* eslint-disable one-var */
import { isEmpty, isNull } from "lodash";
import store from "store2";
import { cat } from "../experimentSetup";
import { getGrade } from "../helperFunctions";

// This function reads the corpus, calls the adaptive algorithm to select
// the next item, stores it in a session variable, and removes it from the corpus
// corpusType is the name of the subTask's corpus within corpusLetterAll[]

export const getStimulus = (corpusType) => {
  let corpus, itemSuggestion;

  const config = store.session.get("config");
  const { grade } = config;
  const { form } = config;
  const corpusKeysSliced = Object.keys(store.session.get("corpora")).slice(3);
  const randomCorpus =
    corpusKeysSliced[Math.floor(Math.random() * corpusKeysSliced.length)];

  // read the current version of the corpus
  corpus = store.session.get("corpora");

  // choose stimulus
  if (corpusType === "practice" || config.task !== "cva") {
    itemSuggestion = cat.findNextItem(corpus[corpusType]);
  }
  // attempt to determine which form the questions will be pulled from
  else {
    const _corpusType = () => {
      if (isNull(grade) || isEmpty(grade)) {
        return randomCorpus;
      }
      if (getGrade(grade) <= 4) {
        return form.toLowerCase() === "a"
          ? "cva-assessment-stimulus-items-a-3-4"
          : "cva-assessment-stimulus-items-b-3-4";
      }
      return form.toLowerCase() === "a"
        ? "cva-assessment-stimulus-items-a-5-6"
        : "cva-assessment-stimulus-items-b-5-6";
    };

    itemSuggestion = cat.findNextItem(corpus[_corpusType()]);
  }

  // store the item for use in the trial
  store.session.set("nextStimulus", itemSuggestion.nextStimulus);

  // update the corpus with the remaining unused items
  corpus[corpusType] = itemSuggestion.remainingStimuli;
  store.session.set("corpora", corpus);
};
