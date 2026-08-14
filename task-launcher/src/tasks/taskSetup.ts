import { Cat } from '@bdelab/jscat';
//@ts-expect-error
import { getDevice } from '@bdelab/roar-utils';
import { initJsPsych } from 'jspsych';
import '../i18n/i18n';
import { taskStore } from '../taskStore';
import { Logger } from '../utils';

export const isTouchScreen = getDevice() === 'mobile';

export let cat: any;

export const initializeCat = () => {
  cat = new Cat({
    method: 'MLE',
    minTheta: -6,
    maxTheta: 6,
    theta: taskStore().startingTheta || 0,
    itemSelect: taskStore().itemSelect,
  });
};

export const jsPsych = initJsPsych({
  on_data_update: (data: Record<string, any>) => {
    // Removing stimulus from data to avoid sending large html files to Levante
    const { stimulus, task, ...rest } = data;
    // Avoid logging fixation trials
    if (task !== 'fixation') {
      Logger.getInstance().capture('JsPsych Data Update', rest);
    }
  },
});

window.initJsPsych = jsPsych;
