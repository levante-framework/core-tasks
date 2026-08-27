import { taskStore } from '../../../taskStore';

export const isTaskFinished = (conditionFunction: () => boolean, frequency = 400) => {
  return new Promise<void>((resolve, reject) => {
    const poll = () => {
      if (taskStore().experimenterExit && !taskStore().demoMode) {
        reject(new DOMException('Experimenter exited task', 'AbortError'));
      } else if (conditionFunction()) {
        resolve();
      } else {
        setTimeout(poll, frequency);
      }
    };
    poll();
  });
};
