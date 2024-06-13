import store from 'store2';
import { finishExperiment } from '../trials';
import { reasonForEnd } from './';
// This feature allows the task configurator to set a time limit for the app,
// configured via url and store variable maxTime.
// Preload time is not included in the time limit

export const maxTimeReached = store.page.namespace('maxTimeReached', false);

export const startAppTimer = () => {
  const maxTimeInMinutes = store.session.get('config').maxTime;

  // Minimum time is 1 minute
  const maxTimeInMilliseconds = Math.max(maxTimeInMinutes, 1) * 60000;

  const timerId = setTimeout(() => {
    maxTimeReached('maxTimeReached', true)
    finishExperiment();
    clearTimeout(timerId);
  }, maxTimeInMilliseconds);
};

