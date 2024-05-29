import store from 'store2';

// This feature allows the caller to set a time limit for the app, configured via url and store variable maxTime
// the preload time is not included in the time limit
// initAppTimer() can be called in initTimeline to limit the duration of the entire app
// Be sure to call clearTimeout() before exiting

export const initAppTimer = () => {
  const maxTime = store.session.get('config').maxTime;
  console.log("maxTime in initAppTimer is: ", maxTime);

  if (maxTime) {
    // create a timer to flag that it's time to exit the app
    const maxTimeInMilliseconds = Math.max(maxTime, 1) * 60000;
    console.log("maxTimeInMilliseconds is: ", maxTimeInMilliseconds);

    const timerId = setTimeout(() => {
      store.session.set('maxTimeReached', true);
    }, maxTimeInMilliseconds);

    store.session.set('maxTimerId', timerId);
  }

  // init to false, when there is no timeout con figured it will never be true
  store.session.set('maxTimeReached', false);
};

export const isMaxTimeoutReached = () => {
  return store.session('maxTimeReached');
};
