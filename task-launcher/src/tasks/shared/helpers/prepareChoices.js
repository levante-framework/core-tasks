import _shuffle from 'lodash/shuffle';
import store from 'store2';
import { fractionToMathML } from './';

export const prepareChoices = (target, distractors, randomizeOrder = true, trialType) => {
  let choices;
  if (!target || distractors.includes(target)) { // If target is not present, don't add to options
    choices = [...distractors];
  } else {
    choices = [target, ...distractors]; // add target to options
  }

  // Randomize the order of the choices if required
  if (randomizeOrder) {
    choices = _shuffle(choices);
  }

  if (trialType === 'Fraction') {
    store.session.set('nonFractionSelections', choices);
    choices = choices.map((choice) => fractionToMathML(choice));
  }

  // Update session variables
  const correctResponseIdx = trialType === 'Fraction' ? store.session('nonFractionSelections').indexOf(target) : choices.indexOf(target);
  store.session.set('target', target);
  store.session.set('correctResponseIdx', correctResponseIdx);
  store.session.set('choices', choices);

  return {
    target: target,
    choices: choices,
  };
};
