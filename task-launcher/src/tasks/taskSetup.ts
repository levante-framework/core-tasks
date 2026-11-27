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

// jsPsych's audioContext() calls resume() whenever the context is suspended and
// drops the promise. Preload calls it once per clip, before any tap, and Safari
// can reject that with "Failed to start the audio device" (DASHBOARD-4N).
// Decoding works while the context is suspended. Continue is the only resume.
const mediaApi = jsPsych.pluginAPI as unknown as {
  audioContext: () => AudioContext | null;
  context: AudioContext | null;
};
mediaApi.audioContext = () => mediaApi.context;

window.initJsPsych = jsPsych;
