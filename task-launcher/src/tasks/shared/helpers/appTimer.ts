import { taskStore } from '../../../taskStore';
import { finishExperiment } from '../trials';
import { PageStateHandler} from './PageStateHandler';

// This feature allows the task configurator to set a time limit for the app,
// configured via url and store variable maxTime.
// Preload time is not included in the time limit

// define timerId here so that it can be cleared if task ends early
let timerId: any;

export const startAppTimer = (maxTimeInMinutes: number, finishExperiment: () => void) => {
  // Minimum time is 1 minute
  const maxTimeInMilliseconds = Math.max(maxTimeInMinutes, 1) * 60000;

  taskStore('startTime', Date.now());

  timerId = setTimeout(() => {
    taskStore('maxTimeReached', true);
    finishExperiment();
    clearTimeout(timerId);
  }, maxTimeInMilliseconds);
};

// function for ending the task if the next trial
export async function checkEndTaskEarly(timeRemaining: number, stimAudio: string) {
    const pageStateHandler = new PageStateHandler(stimAudio, false); 
    const minTrialDuration = await pageStateHandler.getStimulusDurationMs() + 2000; 

    if (timeRemaining < minTrialDuration) {
      clearTimeout(timerId);
      finishExperiment(); 
    }
  }
