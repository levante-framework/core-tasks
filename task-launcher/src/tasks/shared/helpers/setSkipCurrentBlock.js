import store from 'store2';
import { taskStore } from './';

export const setSkipCurrentBlock = (skipTrialType) => {
  if (!!store.page.get('failedPrimaryTrials') && taskStore().numIncorrect >= 1) {
    taskStore('numIncorrect', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
  } else if ((taskStore().numIncorrect >= taskStore().maxIncorrect)) {
    taskStore('numIncorrect', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
    store.page.set('failedPrimaryTrials', true);
  }
};
