import { taskStore } from '../../../taskStore';

export function setupHafMultiResponseTouchRouting(): void {
  const toast = document.createElement('div');
  toast.id = 'lev-toast-default';
  toast.classList.add('lev-toast-default');
  toast.textContent = taskStore().translations.heartsAndFlowersClickReminder;
  if (!taskStore().inputCapability.touch) {
    document.body.appendChild(toast);
  }

  document.querySelectorAll('.jspsych-html-multi-response-button').forEach((wrapper) => {
    const htmlWrapper = wrapper as HTMLElement;
    if (htmlWrapper.dataset.hafTouchRouting === '1') return;
    htmlWrapper.dataset.hafTouchRouting = '1';

    let syntheticClick = false;

    htmlWrapper.addEventListener(
      'touchend',
      (e) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length > 0) return;
        if (touchEvent.cancelable) touchEvent.preventDefault();
        syntheticClick = true;
        htmlWrapper.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        syntheticClick = false;
      },
      { passive: false },
    );

    htmlWrapper.addEventListener(
      'click',
      (e) => {
        const pointerEvent = e as PointerEvent;
        if (syntheticClick) return;
        if (!pointerEvent.isTrusted) return;

        triggerToast();
        pointerEvent.preventDefault();
        pointerEvent.stopImmediatePropagation();
      },
      true,
    );
  });
}

let timeoutID: ReturnType<typeof setTimeout> | undefined;

function triggerToast(): void {
  if (taskStore().inputCapability.touch) {
    return;
  }

  const toast = document.getElementById('lev-toast-default');

  if (toast && !toast.classList.contains('show')) {
    toast.classList.add('show');

    timeoutID = setTimeout(() => {
      if (toast) {
        toast.classList.remove('show');
      }
    }, 5000);
  } else if (toast?.classList.contains('show')) {
    clearTimeout(timeoutID);

    timeoutID = setTimeout(() => {
      if (toast) {
        toast.classList.remove('show');
      }
    }, 5000);
  }
}
