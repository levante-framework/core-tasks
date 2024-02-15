import _shuffle from 'lodash/shuffle'
import store from "store2";
import { mediaAssets } from '../../..';

export const prepareChoices = (target, distractors, randomizeOrder=true) => {
    // randomly select a location for the correct answer
    console.log({distractors})
    const randIndex = Math.floor(Math.random() * distractors.length + 1);
  
    // randomize the order of the distractors
    let randomizedChoices;
    if(randomizeOrder) {
      randomizedChoices = _shuffle(distractors);
    } else {
      randomizedChoices = distractors;
    }
  
    // GK: I don't love this task-specific specification; seems like we should generally
    // insert the target if it's not already in the distractors
    if (store.session('config').task !== 'mental-rotation') {
      // certain tasks like mental rotation have the answer in the distractors 
      // GK: this is not actually true any longer
      randomizedChoices.splice(randIndex, 0, target);
    }
  
    store.session.set("target", target);
    store.session.set("correctResponseIdx", randIndex); // GK: also, isn't this variable meaningless if the target was already in the distractors? 
    store.session.set("choices", randomizedChoices);

    return {
      target: target,
      choices: randomizedChoices,
    };
  };