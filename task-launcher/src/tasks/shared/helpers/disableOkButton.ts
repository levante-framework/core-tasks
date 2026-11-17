export function disableOkButton() {
  const okButton: HTMLButtonElement | null = document.querySelector('.primary:not(.exit-confirmation-choice)');
  if (okButton != null) {
    okButton.disabled = true;
  }
}
