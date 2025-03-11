import store from 'store2';
import { taskStore } from '../../../taskStore';
import { getStimulus } from './getStimulus';

function skipBlock() {
    const skipBlockTrialType = store.page.get('skipCurrentBlock');
    store.page.set('trialsSkipped', 0); 
    while (taskStore().nextStimulus.trialType === skipBlockTrialType) {
      getStimulus("stimulus"); 
      taskStore().nextStimulus.trialType; 
      store.page.transact('trialsSkipped', (oldVal: number) => oldVal + 1); 
    }
  }

export const setSkipCurrentBlock = (skipTrialType: string) => {
  if (!!store.page.get('failedPrimaryTrials') && taskStore().numIncorrect >= 1) {
    taskStore('numIncorrect', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
    skipBlock();
  } else if ((taskStore().numIncorrect >= taskStore().maxIncorrect)) {
    taskStore('numIncorrect', 0);
    store.page.set('skipCurrentBlock', skipTrialType);
    store.page.set('failedPrimaryTrials', true);
    skipBlock();
  }
};
