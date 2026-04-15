import { taskStore } from '../../../taskStore';

export function setupHafMultiResponseTouchRouting() {
  const toast = document.createElement('div');
  toast.id = 'lev-toast-default';
  toast.classList.add('lev-toast-default');
  toast.textContent = taskStore().translations.heartsAndFlowersClickReminder;
  document.body.appendChild(toast);

  document.querySelectorAll('.jspsych-html-multi-response-button').forEach((wrapper) => {
    if (wrapper.dataset.hafTouchRouting === '1') return;
    wrapper.dataset.hafTouchRouting = '1';

    let syntheticClick = false;

    wrapper.addEventListener(
      'touchend',
      (e) => {
        if (e.touches.length > 0) return;
        if (e.cancelable) e.preventDefault();
        syntheticClick = true;
        wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        syntheticClick = false;
      },
      { passive: false },
    );

    wrapper.addEventListener(
      'click',
      (e) => {
        if (syntheticClick) return;
        if (!e.isTrusted) return;

        triggerToast(taskStore().translations.generalEncourage);
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      true,
    );
  });
}

let timeoutID; 
function triggerToast() {
  const toast = document.getElementById('lev-toast-default');
  
  if (toast && !toast.classList.contains('show')) {
    toast.classList.add('show');

    timeoutID = setTimeout(() => {
      if (toast) {
        toast.classList.remove('show');
      }
    }, 5000);
  } else if (toast && toast.classList.contains('show')) {
    clearTimeout(timeoutID);

    timeoutID = setTimeout(() => {
      if (toast) {
        toast.classList.remove('show');
      }
    }, 5000);
  }
}
