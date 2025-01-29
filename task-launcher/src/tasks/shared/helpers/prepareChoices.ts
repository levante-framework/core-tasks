import _shuffle from 'lodash/shuffle';
import { fractionToMathML } from './fractionToMathML';
import { taskStore } from '../../../taskStore';

export const prepareChoices = (
  target: string,
  distractors: string[],
  randomizeOrder = true,
  trialType?: string,
) => {
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
  const originalChoices = [...choices];
  if (trialType === 'Fraction') {
    taskStore('nonFractionSelections', choices);
    choices = choices.map((choice) => fractionToMathML(choice));
  }

  // Update session variables
  const correctResponseIdx = trialType === 'Fraction' ? taskStore().nonFractionSelections.indexOf(target) : choices.indexOf(target);
  taskStore('target', target);
  taskStore('correctResponseIdx', correctResponseIdx);
  taskStore('choices', choices);

  return {
    target,
    choices,
    originalChoices,
    correctResponseIdx,
  };
};
