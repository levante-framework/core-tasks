// Previously named waitFor

export const isTaskFinished = (conditionFunction: Function, frequency = 400) => {
  const poll = (resolve: Function) => {
    if (conditionFunction()) {
      resolve();
    } else {
      setTimeout(() => poll(resolve), frequency);
    }
  };

  return new Promise(poll);
};
