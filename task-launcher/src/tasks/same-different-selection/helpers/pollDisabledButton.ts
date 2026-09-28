export function isButtonDisabled(button: HTMLButtonElement) {
  return new Promise<void>((resolve) => {
    const poll = () => {
      if (button.disabled) {
        resolve();
      } else {
        setTimeout(poll, 10);
      }
    };
    poll();
  });
}
