// Previously named waitFor

export const isTaskFinished = (conditionFunction: () => boolean) => {
  return new Promise<void>((resolve) => {
    const poll = () => {
      if (conditionFunction()) {
        resolve();
      } else {
        setTimeout(poll, 400);
      }
    };
    poll();
  });
};
