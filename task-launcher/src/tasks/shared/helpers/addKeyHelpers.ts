import { isTouchScreen } from '../../taskSetup';
import { arrowKeyEmojis } from './components';

export function addKeyHelpers(el: HTMLElement, keyIndex: number) {
    if (!isTouchScreen) {
      const arrowKeyBorder = document.createElement('div');
      arrowKeyBorder.classList.add('arrow-key-border');
  
      const arrowKey = document.createElement('p');
      arrowKey.innerHTML = arrowKeyEmojis[keyIndex][1];
      arrowKey.style.textAlign = 'center';
      arrowKey.style.margin = '0';
      arrowKeyBorder.appendChild(arrowKey);
      el.appendChild(arrowKeyBorder);
    }
  }
