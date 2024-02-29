import _shuffle from 'lodash/shuffle'
import store from "store2";
import { mediaAssets } from '../../..';

export const prepareChoices = (target, distractors, randomizeOrder = true) => {
  console.log({ distractors });

  let choices = [target, ...distractors]; // Always include target in the choices

  // Randomize the order of the choices if required
  if (randomizeOrder) {
      choices = _shuffle(choices);
  }

  // Update session variables
  const correctResponseIdx = choices.indexOf(target); // Find the new index of the target
  store.session.set("target", target);
  store.session.set("correctResponseIdx", correctResponseIdx);
  store.session.set("choices", choices);

  return {
      target: target,
      choices: choices,
  };
};