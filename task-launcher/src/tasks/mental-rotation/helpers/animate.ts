import { matrixDragAnimation, triggerAnimation } from "../../shared/helpers";

export function animate(animation: string, itemToAnimate: string, dragTarget?: string) {
    if (animation == 'pulse') {
        const elementToAnimate = document.getElementById(itemToAnimate);

        return triggerAnimation(elementToAnimate, 'pulse 2s 0s');
    } else if (animation == 'drag') {
        const elementToAnimate = document.getElementById('stim-image');
        const dragTargetElement = document.getElementById(itemToAnimate);

        return matrixDragAnimation(dragTargetElement as HTMLElement, elementToAnimate as HTMLElement);
    }
}
