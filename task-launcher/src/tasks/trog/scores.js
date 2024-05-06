import _mapValues from 'lodash/mapValues';
import store from 'store2';

// Taken from Letter, Adjust for multichoice

/**
 * This function calculates computed scores given raw scores for each subtask.
 *
 * The input raw scores are expected to conform to the following interface:
 *
 * interface IRawScores {
 *   [key: string]: {
 *     practice: ISummaryScores;
 *     test: ISummaryScores;
 *   };
 * }
 *
 * where the top-level keys correspond to this assessment's subtasks. If this
 * assessment has no subtasks, then there will be only one top-level key called
 * "total." Each summary score object implements this interface:
 *
 * interface ISummaryScores {
 *   thetaEstimate: number | null;
 *   thetaSE: number | null;
 *   numAttempted: number;
 *   numCorrect: number;
 *   numIncorrect: number;
 * }
 *
 * The returned computed scores must have that same top-level keys as the input
 * raw scores, and each value must be a single number or null.
 *
 * @param {*} rawScores
 * @returns {*} computedScores
 */
export const computedScoreCallback = (rawScores) => {
  // This returns an object with the same top-level keys as the input raw scores
  // But the values are the number of correct trials, not including practice trials.
  const computedScores = _mapValues(rawScores, (subtaskScores) => {
    const subScore = subtaskScores.test?.numCorrect || 0;
    const subPercentCorrect = subtaskScores.test?.numCorrect / subtaskScores.numAttempted || 0;

    // add list of correct/incorrect items per subtask
    // const correctItems = store.session("correctItems");
    // const incorrectItems = store.session("incorrectItems");

    return {
      subScore: subScore,
      subPercentCorrect: subPercentCorrect,
    };
  });

  // computedScores should now have keys for each subtask.
  // But we also want to update the total score so we add up all of the others.
  //const totalScore = _reduce(_omit(computedScores, ['composite']), (sum, score) => sum + score.subScore, 0);
  computedScores.composite = {
    totalCorrect: store.session.get('totalCorrect'),
    totalNumAttempted: store.session.get('trialNumTotal'),
    totalPercentCorrect: Math.round((store.session.get('totalCorrect') / store.session.get('trialNumTotal')) * 100),
  };

  return computedScores;
};

/**
 * This function normalizes computed scores using participant demographic data.
 *
 * For example, it may return a percentile score and a predicted score on another
 * standardized test.
 *
 * The input computed scores are expected to conform to output of the
 * computedScoreCallback() function, with top-level keys corresponding to this
 * assessment's subtasks and values that are either numbers or null.
 *
 * The returned normalized scores must have that same top-level keys as the input and can
 * have arbitrary nested values. For example, one might return both a percentile
 * score and a predicted Woodcock-Johnson score:
 *
 * {
 *   total: {
 *    percentile: number;
 *    wJPercentile: number;
 *   }
 * }
 *
 * @param {*} computedScores
 * @param {*} demographic_data
 * @returns {*} normedScores
 */
// eslint-disable-next-line no-unused-vars
export const normedScoreCallback = (computedScores, demographic_data) => {
  // TODO: Add table lookup after norms have been collected and established.
  return Object.fromEntries(Object.entries(computedScores).map(([key, val]) => [key, val]));
};
