function resizeButtonText(button: HTMLButtonElement, minFontSize: number) {
  const maxWidth = button.clientWidth;
  const maxHeight = button.clientHeight;
  let fontSize = parseInt(window.getComputedStyle(button).fontSize);

  // Decrease font size until text fits inside the button
  while ((button.scrollWidth > maxWidth || button.scrollHeight > maxHeight) && fontSize > minFontSize) {
    fontSize--;
    button.style.fontSize = fontSize + 'px';
  }

  return fontSize;
}

export function equalizeButtonSizes(buttons: NodeListOf<HTMLButtonElement>, minFontSize: number) {
    const buttonWidths = [];
    const buttonHeights = [];
    const buttonFontSizes = [];
    
    // get starting button sizes
    for (let i = 0; i < buttons.length; i++) {
      const rect = buttons[i].getBoundingClientRect();
      
      buttonWidths.push(rect.width);
      buttonHeights.push(rect.height);
    }
    
    // resize all buttons to small button size and shrink text to fit
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].style.width = Math.min(...buttonWidths).toString() + 'px';
      buttons[i].style.height = Math.min(...buttonHeights).toString() + 'px';

      buttonFontSizes.push(resizeButtonText(buttons[i], minFontSize)); 
    }

    // resize all text to smallest size
    const smallestFont = Math.min(...buttonFontSizes); 
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].style.fontSize = smallestFont + 'px';
    }
}
