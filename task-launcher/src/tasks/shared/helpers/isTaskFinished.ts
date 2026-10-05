import { taskStore } from '../../../taskStore';

export const isTaskFinished = (conditionFunction: () => boolean) => {
  return new Promise<void>((resolve, reject) => {
    const poll = () => {
      if (taskStore().taskAborted) {
        taskStore().demoMode || taskStore().effectiveStoppingRule === 'sufficientTrials'
          ? resolve()
          : reject(new DOMException('Experimenter exited task', 'AbortError'));
      } else if (conditionFunction()) {
        resolve();
      } else {
        setTimeout(poll, 400);
      }
    };
    poll();
  });
};
