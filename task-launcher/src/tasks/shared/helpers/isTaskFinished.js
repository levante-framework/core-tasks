// Previously named waitFor

export const isTaskFinished = (conditionFunction) => {
    const poll = (resolve) => {
      if (conditionFunction()) {
        resolve();
      } else {
        setTimeout((_) => poll(resolve), 400)
      };
    };
  
    return new Promise(poll);
  };