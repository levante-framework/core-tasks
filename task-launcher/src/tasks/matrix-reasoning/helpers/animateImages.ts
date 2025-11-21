export function triggerAnimation(itemsToAnimate: any[], animation: string) {
    const item = itemsToAnimate.pop();
    
    if (!item) {
        return; // Exit early if no item to animate
    }

    if (item instanceof Array) {
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

    return itemsToAnimate;
}

// drags the target element to fill in the missing space in the stimulus image
export function matrixDragAnimation(stimImage: HTMLElement, target: HTMLElement) {
    // Calculate the center of stimImage
    const rect = stimImage.getBoundingClientRect();
    const targetPositionX = rect.left + (rect.width * 0.5);
    const targetPositionY = rect.top + (rect.height * 0.5); 

    // Get current position of the target button
    const currentRect = target.getBoundingClientRect();
    const startX = currentRect.left;
    const startY = currentRect.top;

    // Set up the target button for absolute positioning
    target.style.position = 'absolute';
    target.style.left = `${startX}px`;
    target.style.top = `${startY}px`;

    const duration = 2000; 
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // creates gradual easing effect to make the animation more natural
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Calculate current position
      const currentX = startX + (targetPositionX - startX) * easeOut;
      const currentY = startY + (targetPositionY - startY) * easeOut;

      // Update position
      target.style.left = `${currentX}px`;
      target.style.top = `${currentY}px`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
}