import store from 'store2';

export const setSkipCurrentBlock = (skipTrialType, finishExperiment) => {
  if (!!store.page.get('failedPrimaryTrials') && store.session.get('incorrectTrials') >= 1) {
    store.session.set('incorrectTrials', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
    console.log('mark://', 'Skipping after 1 failure due to failing primary task');
  } else if ((store.session.get('incorrectTrials') >= store.session.get('config').maxIncorrect)) {
    store.session.set('incorrectTrials', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
    store.page.set('failedPrimaryTrials', true);
    console.log('mark://', 'Skipping after 3 failure and setting failedPrimaryTrials to true');
  } else if (store.session.get('maxTimeReached') && finishExperiment) {
    finishExperiment();
  }
};