import { isTouchScreen } from '../../taskSetup';
import { arrowKeyEmojis } from './components';

export function addKeyHelpers(el: HTMLElement, keyIndex: number) {
  if (!isTouchScreen) {
    const arrowKeyBorder = document.createElement('div');
    arrowKeyBorder.classList.add('arrow-key-border');
    arrowKeyBorder.style.position = 'absolute';
    arrowKeyBorder.style.inset = '0';
    arrowKeyBorder.style.display = 'flex';
    arrowKeyBorder.style.justifyContent = 'center';
    arrowKeyBorder.style.alignItems = 'center';

    el.style.position = 'relative';

    const arrowKey = document.createElement('p');
    arrowKey.innerHTML = arrowKeyEmojis[keyIndex][1];
    arrowKey.style.textAlign = 'center';
    arrowKey.style.margin = '0';
    arrowKeyBorder.appendChild(arrowKey);
    el.appendChild(arrowKeyBorder);
  }
}
