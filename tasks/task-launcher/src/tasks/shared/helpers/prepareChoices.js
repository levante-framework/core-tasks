import _shuffle from 'lodash/shuffle'
import store from "store2";
import { mediaAssets } from '../../..';

export const prepareChoices = (target, distractors) => {
    // randomly select a location for the correct answer
    const randIndex = Math.floor(Math.random() * distractors.length + 1);
  
    // randomize the order of the distractors
    let randomizedChoices = _shuffle(distractors);

    console.log(randomizedChoices)

    if (store.session.get('config').task === 'matrix-reasoning') {
      const choices = []
      for (let i = 0; i < randomizedChoices.length; i++) {
        choices.push(`<img src=${mediaAssets.images[randomizedChoices[i]]} alt=${mediaAssets.images[randomizedChoices[i]]} />`)
      }

      console.log(choices)
    
      // insert the target
      choices.splice(randIndex, 0, `<img src=${mediaAssets.images[target]} alt=${mediaAssets.images[target]}/>`);
      randomizedChoices = choices
    } else {
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