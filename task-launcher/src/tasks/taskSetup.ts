import { Cat } from '@bdelab/jscat';
//@ts-expect-error
import { getDevice } from '@bdelab/roar-utils';
import { initJsPsych } from 'jspsych';
import '../i18n/i18n';
import { taskStore } from '../taskStore';

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
  on_data_update: () => {},
});

window.initJsPsych = jsPsych;
