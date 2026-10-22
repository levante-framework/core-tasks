import { mediaAssets } from '../../..';
import { downArrowSvg } from './components';

export function shiftAnimation(itemsToAnimate: any, animation: string) {
  const item = itemsToAnimate.shift();

  if (!item) {
    return; // Exit early if no item to animate
  }

  triggerAnimation(item, animation);

  return itemsToAnimate;
}

export function triggerAnimation(item: any, animation: string) {
  if (Array.isArray(item)) {
    item.forEach((item) => {
      item.style.animation = 'none';
      item.offsetHeight; // Force reflow
      item.style.animation = animation;
    });
  } else {
    item.style.animation = 'none';
    item.offsetHeight; // Force reflow
    item.style.animation = animation;
  }
}

// drags the target element to fill in the missing space in the stimulus image
export function displaceAnimation(
  destination: HTMLElement,
  origin: HTMLElement,
  cursorTarget: 'origin' | 'destination',
  offSetX: number = 0,
  offSetY: number = 0,
  leaveCopyInPlace: boolean,
  blackOutImage = false,
) {
  const addCursorPulse = () => {
    const rect = cursorTarget === 'origin' ? origin.getBoundingClientRect() : destination.getBoundingClientRect();
    const cursorImg = document.createElement('img');
    cursorImg.src = mediaAssets.images.pointingHand;
    cursorImg.style.position = 'absolute';
    cursorImg.style.width = `${rect.width * 0.7}px`;
    cursorImg.style.height = 'auto';
    cursorImg.style.left = `${rect.left + rect.width / 4}px`;
    cursorImg.style.top = `${rect.top + rect.height / 4}px`;
    cursorImg.style.pointerEvents = 'none';
    cursorImg.style.zIndex = '20';
    cursorImg.style.animation = 'pulse 2s 1';

    document.body.appendChild(cursorImg);

    window.setTimeout(() => {
      startDragAnimation();
    }, 2000);

    window.setTimeout(() => {
      cursorImg.remove();
    }, 4000);
  };

  const startDragAnimation = () => {
    const transitionDuration = 1000;

    // Get current position of the target button
    const currentRect = origin.getBoundingClientRect();
    const startX = currentRect.left;
    const startY = currentRect.top;

    let animatedTarget: HTMLElement;

    if (leaveCopyInPlace) {
      // create a non-interactive copy to animate
      animatedTarget = origin.cloneNode(true) as HTMLElement;
      animatedTarget.id = 'animated-target';
      animatedTarget.style.position = 'absolute';
      animatedTarget.style.transition = `opacity ${transitionDuration}ms ease`;
      animatedTarget.style.opacity = '1';
      animatedTarget.style.left = `${startX}px`;
      animatedTarget.style.top = `${startY}px`;

      // gray out the original button
      origin.style.transition = `opacity ${transitionDuration}ms ease`;
      origin.classList.add('image-grayed-out');

      const animationParent = origin.parentElement ?? document.body;
      animationParent.appendChild(animatedTarget);
    } else {
      animatedTarget = origin;
      animatedTarget.style.position = 'absolute';
      animatedTarget.style.transition = `opacity ${transitionDuration}ms ease`;
    }

    // Function to update position based on stimImage
    const updatePosition = () => {
      const rect = destination.getBoundingClientRect();
      const targetPositionX = rect.left + rect.width * offSetX;
      const targetPositionY = rect.top + rect.height * offSetY;
      animatedTarget.style.left = `${targetPositionX}px`;
      animatedTarget.style.top = `${targetPositionY}px`;
    };

    const fadeOutThenMove = () => {
      animatedTarget.style.opacity = '0';
      setTimeout(() => {
        updatePosition();
        requestAnimationFrame(() => {
          animatedTarget.style.opacity = '1';
        });
      }, transitionDuration);

      window.setTimeout(() => {
        if (blackOutImage) {
          // replace the target image with a black background to give the illusion that the bunny fits perfectly for mental rotation
          (destination.children[0] as HTMLImageElement).src = mediaAssets.images.blackBackground;
          animatedTarget.style.zIndex = '10';
        }
      }, transitionDuration * 2);
    };

    fadeOutThenMove();

    window.addEventListener('resize', updatePosition);
  };

  addCursorPulse();
}

// adds an svg icon on top of an image element
function placeIcon(
  elem: HTMLElement, 
  iconSvg: string, 
  pulse = false, 
  offsetX: number = 0, // offset by percentage of image width
  offsetY: number = 0 // offset by percentage of image height
) {
  const image =
    elem instanceof HTMLImageElement ? elem : elem.querySelector('img');
  if (!(image instanceof HTMLImageElement)) return;

  const host = document.createElement('div');
  host.style.position = 'relative';
  host.style.display = 'inline-block';
  host.style.lineHeight = '0';

  image.replaceWith(host);
  host.appendChild(image);

  const { offsetWidth: width, offsetHeight: height } = image;

  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.left = `${width / 2 + (offsetX / 100) * width}px`;
  overlay.style.top = `${height / 2 - (offsetY / 100) * height}px`;
  overlay.style.transform = 'translate(-50%, -50%)';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '2';

  const icon = document.createElement('div');
  icon.innerHTML = iconSvg;
  if (pulse) {
    icon.style.animation = 'pulse 2s 0s infinite';
  }

  overlay.appendChild(icon);
  host.appendChild(overlay);
}

// returns an array of functions that animate DOM elements by itemId for items with custom animations
export function getAnimationsById(
  itemId: string,
  stimImages: HTMLElement[]
): {timeControl: 'timeStamp' | 'audioFile', animations: (() => void)[]} | null {
  let animationConfig: {timeControl: 'timeStamp' | 'audioFile', animations: (() => void)[]} | null;

  switch (itemId) {
    case 'ToM-scene1-instruct2-downex':
      animationConfig = {
        timeControl: 'timeStamp', 
        animations: [
          () => {triggerAnimation(stimImages[0], 'pulse 2s 0s')},
          () => {triggerAnimation(stimImages[1], 'pulse 2s 0s')}
        ]
      };
      break;
    case 'ToM-scene2-instruct1-downex':
      animationConfig = {
        timeControl: 'timeStamp', 
        animations: [
          () => {triggerAnimation(stimImages[0], 'pulse 2s 0s')},
          () => {triggerAnimation(stimImages[1], 'pulse 2s 0s')}
        ]
      };
      break;
    case 'ToM-scene4-instruct1-downex':
      animationConfig = {
        timeControl: 'timeStamp', 
        animations: [
          () => {triggerAnimation(stimImages[0], 'pulse 2s 0s')},
          () => {triggerAnimation(stimImages[1], 'pulse 2s 0s')}
        ]
      };
      break;
    case 'ToM-scene5-instruct1-downex':
      animationConfig = {
        timeControl: 'audioFile', 
        animations: [
          () => {}, // no animation on the first audio file
          () => {placeIcon(stimImages[0], downArrowSvg, true, -20, -20)}
        ]
      };
      break;
    default:
      animationConfig = null;
      break;
  }

  return animationConfig;
}
