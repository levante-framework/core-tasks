import { jsPsych } from '../../taskSetup';
import cloneDeep from 'lodash/cloneDeep';
import { computedScoreCallback } from '../../trog/helpers/scores';
import { maxTimeReached } from './';
import { taskStore } from './';
import store from 'store2';

export const initTrialSaving = (config) => {
  if (config.displayElement) {
    jsPsych.opts.display_element = config.display_element;
  }

  // Extend jsPsych's on_finish and on_data_update lifecycle functions to mark the
  // run as completed and write data to Firestore, respectively.
  const extend = (fn, code) =>
    function () {
      // eslint-disable-next-line prefer-rest-params
      fn.apply(fn, arguments);
      // eslint-disable-next-line prefer-rest-params
      code.apply(fn, arguments);
    };

  jsPsych.opts.on_finish = extend(jsPsych.opts.on_finish, () => {
    // Add finishing metadata to run doc
    const finishingMetadata = {}

    const incorrectTrials = store.session.get('incorrectTrials')
    const maxIncorrect = taskStore().maxIncorrect

    console.log('incorrectTrials in on_finish cb:', store.session)
    console.log('maxIncorrect in on_finish cb:', maxIncorrect)

    if (maxTimeReached('maxTimeReached')) {
      finishingMetadata.reasonForEnd = ' Max Time'
    } else if (incorrectTrials >= maxIncorrect) {
      finishingMetadata.reasonForEnd = 'Max Incorrect Trials'
    } else {
      finishingMetadata.reasonForEnd = 'Completed Task'
    }

    console.log('finishingMetadata in on_finish cb:', finishingMetadata)

    config.firekit.finishRun(finishingMetadata);
  });

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
