import { taskStore } from '../../../taskStore';

export function isButtonDisabled(button: HTMLButtonElement) {
  return new Promise<void>((resolve) => {
    const poll = () => {
      // Stop polling if the task was aborted, otherwise this never settles.
      if (button.disabled || taskStore().taskAborted) {
        resolve();
      } else {
        setTimeout(poll, 10);
      }
    };
    poll();
  });
}
