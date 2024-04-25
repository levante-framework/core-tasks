import { jsPsych } from '../../taskSetup';
import taskConfig from '../../taskConfig';
import { dashToCamelCase } from './dashToCamelCase';

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

  jsPsych.opts.on_finish = extend(jsPsych.opts.on_finish, (data) => {
    config.firekit.finishRun();
  });

  jsPsych.opts.on_data_update = extend(jsPsych.opts.on_data_update, (data) => {
    if (data.save_trial) {
      // save_trial is a flag that indicates whether the trial should
      // be saved to Firestore. No point in writing it to the db.
      delete data.save_trial;
      delete data.internal_node_id;
      config.firekit.writeTrial(data);
    }
  });

  taskConfig[dashToCamelCase(config.task)].initStore(config);
};
