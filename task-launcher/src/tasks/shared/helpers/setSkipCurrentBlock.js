import store from 'store2';
import { taskStore } from './';

export const setSkipCurrentBlock = (skipTrialType) => {
  if (!!store.page.get('failedPrimaryTrials') && store.session.get('incorrectTrials') >= 1) {
    store.session.set('incorrectTrials', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
  } else if ((store.session.get('incorrectTrials') >= taskStore().maxIncorrect)) {
    store.session.set('incorrectTrials', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
    store.page.set('failedPrimaryTrials', true);
  }
};