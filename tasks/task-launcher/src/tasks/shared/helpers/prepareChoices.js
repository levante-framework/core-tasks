import _shuffle from 'lodash/shuffle'
import store from "store2";
import { mediaAssets } from '../../..';

export const prepareChoices = (target, distractors) => {
    // randomly select a location for the correct answer
    const randIndex = Math.floor(Math.random() * distractors.length + 1);
  
    // randomize the order of the distractors
    const randomizedChoices = _shuffle(distractors);
  
    // insert the target
    if (store.session('config').task !== 'mental-rotation') {
      // certain tasks like mental rotation have the answer in the distractors
      randomizedChoices.splice(randIndex, 0, target);
    }
  
    store.session.set("target", target);
    store.session.set("correctResponseIdx", randIndex);
    store.session.set("choices", randomizedChoices);

    return {
      target: target,
      choices: randomizedChoices,
    };
  };