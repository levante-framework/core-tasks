// Used in Math and Matrix-reasoning so far
import store from 'store2';

export const initSharedStore = (config) => {
  if (store.session.has('initialized') && store.local('initialized')) {
    return store.session;
  }

  store.session.set('itemSelect', 'mfi');

  // Counting variables
  store.session.set('practiceIndex', 0);
  store.session.set('currentBlockIndex', 0); // counter for breaks within subtask

  store.session.set('trialNumSubtask', 0); // counter for trials in subtask
  store.session.set('trialNumTotal', 0); // counter for trials in experiment

  // variables to track current state of the experiment
  store.session.set('currentTrialCorrect', true);
  store.session.set("maxTimeReached", false);


  // running computations
  store.session.set('subtaskCorrect', 0);
  store.session.set('totalCorrect', 0);
  store.session.set('correctItems', []);
  store.session.set('incorrectItems', []);

  store.session.set('initialized', true);
};
