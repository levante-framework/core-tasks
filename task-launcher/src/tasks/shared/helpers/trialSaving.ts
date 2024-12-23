import { jsPsych } from '../../taskSetup';
import cloneDeep from 'lodash/cloneDeep';
import _mapValues from 'lodash/mapValues';
import { taskStore } from '../../../taskStore';

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
export const computedScoreCallback = (rawScores: Record<string, any>) => {
  // This returns an object with the same top-level keys as the input raw scores
  // But the values are the number of correct trials, not including practice trials.
  const computedScores: any = _mapValues(rawScores, (subtaskScores) => {
    const subScore = subtaskScores.test?.numCorrect || 0;
    const subPercentCorrect = subtaskScores.test?.numCorrect / subtaskScores.numAttempted || 0;

    // add list of correct/incorrect items per subtask
    // const correctItems = taskStore().correctItems;
    // const incorrectItems = taskStore().incorrectItems;

    return {
      subScore: subScore,
      subPercentCorrect: subPercentCorrect,
    };
  });

  // computedScores should now have keys for each subtask.
  // But we also want to update the total score so we add up all of the others.
  //const totalScore = _reduce(_omit(computedScores, ['composite']), (sum, score) => sum + score.subScore, 0);
  const { totalCorrect } = taskStore();

  computedScores.composite = {
    totalCorrect: totalCorrect,
    totalNumAttempted: rawScores?.composite?.test?.numAttempted,
    totalPercentCorrect: rawScores?.composite?.test?.numAttempted > 0 
      ? Math.round((totalCorrect / rawScores?.composite?.test?.numAttempted) * 100) 
      : 0, // Default to 0 if numAttempted is zero
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
export const normedScoreCallback = (computedScores: any) => {
  // TODO: Add table lookup after norms have been collected and established.
  return Object.fromEntries(Object.entries(computedScores).map(([key, val]) => [key, val]));
};

export const initTrialSaving = (config: Record<string, any>) => {
  if (config.displayElement) {
    // @ts-ignore
    jsPsych.opts.display_element = config.display_element;
  }

  // Extend jsPsych's on_finish and on_data_update lifecycle functions to mark the
  // run as completed and write data to Firestore, respectively.
  const extend = (fn: Function, code: Function) => (
    function () {
      // eslint-disable-next-line prefer-rest-params
      fn.apply(fn, arguments);
      // eslint-disable-next-line prefer-rest-params
      code.apply(fn, arguments);
    }
  );

  // @ts-ignore
  jsPsych.opts.on_finish = extend(jsPsych.opts.on_finish, () => {
    // Add finishing metadata to run doc
    // const finishingMetadata = {}
    // const { maxTimeReached, numIncorrect, maxIncorrect } = taskStore();

    // if (maxTimeReached) {
    //   finishingMetadata.reasonTaskEnded = 'Max Time'
    // } else if (numIncorrect >= maxIncorrect) {
    //   finishingMetadata.reasonTaskEnded = 'Max Incorrect Trials'
    // } else {
    //   finishingMetadata.reasonTaskEnded = 'Completed Task'
    // }

    // config.firekit.finishRun(finishingMetadata);

    config.firekit.finishRun();
  });

  // @ts-ignore
  jsPsych.opts.on_data_update = extend(jsPsych.opts.on_data_update, (data) => {
    if (data.save_trial) {
      // save_trial is a flag that indicates whether the trial should
      // be saved to Firestore. No point in writing it to the db.
      // creating a deep copy to prevent modifying of original data
      // since it is used down the line for the rest of the pipeline

      const dataCopy = cloneDeep(data);
      delete dataCopy.save_trial;
      delete dataCopy.internal_node_id;
      delete dataCopy.button_response;
      delete dataCopy.keyboard_response;
      delete dataCopy.response_source;
      dataCopy.responseSource = data.response_source;
      delete dataCopy.trial_type;
      dataCopy.trialIndex = dataCopy.trial_index;
      delete dataCopy.trial_index;

      if (config.isRoarApp) {
        config.firekit.writeTrial(dataCopy, computedScoreCallback);
      } else {
        config.firekit.writeTrial(dataCopy);
      }
    }
  });
};
