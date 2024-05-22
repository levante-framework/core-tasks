import store from 'store2';

export const setSkipCurrentBlock = (skipTrialType, finishExperiment) => {
  if (!!store.page.get('failedPrimaryTrials') && store.session.get('incorrectTrials') >= 1) {
    store.session.set('incorrectTrials', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
  } else if ((store.session.get('incorrectTrials') >= store.session.get('config').maxIncorrect)) {
    store.session.set('incorrectTrials', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
    store.page.set('failedPrimaryTrials', true);
  } else if (store.session.get('maxTimeReached') && finishExperiment) {
    finishExperiment();
  }
};