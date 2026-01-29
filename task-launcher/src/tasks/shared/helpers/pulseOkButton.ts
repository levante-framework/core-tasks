import { taskStore } from "../../../taskStore";

export function pulseOkButton(waitTime: number, trialNumber: number) {
    const okButton = document.querySelector('.primary') as HTMLButtonElement;

    // make sure we aren't carrying over to the next trial
    if (okButton && taskStore().totalTrialCount === trialNumber) {
        setTimeout(() => {
            okButton.style.animation = 'pulse 2s infinite';
        }, waitTime);
    }
}
