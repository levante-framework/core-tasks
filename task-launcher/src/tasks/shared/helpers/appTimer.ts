import { taskStore } from '../../../taskStore';
// This feature allows the task configurator to set a time limit for the app,
// configured via url and store variable maxTime.
// Preload time is not included in the time limit

export const startAppTimer = (maxTimeInMinutes: number, finishExperiment: () => void) => {
  // Minimum time is 1 minute
  const maxTimeInMilliseconds = Math.max(maxTimeInMinutes, 1) * 60000;

  const timerId = setTimeout(() => {
    taskStore('maxTimeReached', true);
    finishExperiment();
    clearTimeout(timerId);
  }, maxTimeInMilliseconds);
};
