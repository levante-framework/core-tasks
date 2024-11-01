import { getDevice } from '@bdelab/roar-utils';
import { Cat } from '@bdelab/jscat';
import { initJsPsych } from 'jspsych';
import '../i18n/i18n';
import { taskStore } from './shared/helpers';

export const isTouchScreen = getDevice() === 'mobile';

export let cat;

export const initializeCat = () => {
  cat = new Cat({
    method: 'MLE',
    // minTheta: -6,
    // maxTheta: 6,
    itemSelect: taskStore().itemSelect,
  });
};

export const jsPsych = initJsPsych({
  on_finish: () => {
    // navigate to prolific page
    // swap url
    //window.location.href = "https://app.prolific.co/submissions/complete?cc=4C0E9E0F";
  },
});

window.initJsPsych = jsPsych;
