import { matrixDragAnimation, triggerAnimation } from "../../shared/helpers";

export function animate(animation: string, itemsToAnimate: string[], dragTarget?: string) {

   let elementsToAnimate = itemsToAnimate.map(item => document.getElementById(item));
   let dragTargetElement = dragTarget ? document.getElementById(dragTarget) : undefined;

    if (animation == 'pulse') {
        return triggerAnimation(elementsToAnimate, 'pulse 2s 0s');
    } else if (animation == 'drag') {
        return matrixDragAnimation(dragTargetElement as HTMLElement, elementsToAnimate[0] as HTMLElement);
    }
}
