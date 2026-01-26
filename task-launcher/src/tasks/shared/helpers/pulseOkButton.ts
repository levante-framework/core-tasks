export function pulseOkButton() {
    const okButton = document.querySelector('.primary') as HTMLButtonElement;
    if (okButton) {
        okButton.style.animation = 'pulse 2s infinite';
    }
}