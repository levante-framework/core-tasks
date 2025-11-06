import { taskStore } from '../../../taskStore';
import { finishExperiment } from '../trials';
import { PageStateHandler } from './PageStateHandler';

// This feature allows the task configurator to set a time limit for the app,
// configured via url and store variable maxTime.
// Preload time is not included in the time limit

// define timerId here so that it can be cleared if task ends early
let timerId: any;
// buffer in milliseconds after presentation of stimulus to allow some time to answer
const RESPONSE_BUFFER = 2000;

export const startAppTimer = (maxTimeInMinutes: number, finishExperiment: () => void) => {
  // Minimum time is 1 minute
  const maxTimeInMilliseconds = Math.max(maxTimeInMinutes, 1) * 60000;

  taskStore('startTime', Date.now());

  timerId = setTimeout(() => {
    taskStore('maxTimeReached', true);
    clearTimeout(timerId);
  }, maxTimeInMilliseconds);
};

// function for ending the task if the next trial
export async function checkEndTaskEarly(timeRemaining: number, stimAudio: string) {
  const pageStateHandler = new PageStateHandler(stimAudio, false);
  const minTrialDuration = (await pageStateHandler.getStimulusDurationMs()) + RESPONSE_BUFFER;

  if (timeRemaining < minTrialDuration) {
    clearTimeout(timerId);
    finishExperiment();
  }
}
