describe('intro Simple Task Capture', () => {
  it('should capture screenshots while progressing through task', () => {
    const taskName = 'intro';
    const screenshotInterval = 6 * 1000;
    const maxDuration = 240 * 1000;
    let screenshotCount = 0;
    
    // Visit task with fullscreen API mocking
    cy.visit(`http://localhost:8080/?task=${taskName}`, {
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
        
        // Mock audio context
        win.AudioContext = win.AudioContext || win.webkitAudioContext || function() {
          return {
            createOscillator: () => ({ 
              connect: () => {}, 
              start: () => {}, 
              stop: () => {},
              frequency: { value: 440 }
            }),
            createGain: () => ({ 
              connect: () => {}, 
              gain: { value: 0.5 }
            }),
            destination: {},
            currentTime: 0,
            state: 'running'
          };
        };
      }
    });

    // Initial screenshot
    cy.screenshot(`00-start`, { capture: 'viewport' });
    screenshotCount++;
    
    // Main interaction loop
    const startTime = Date.now();
    
    function captureAndInteract() {
      const currentTime = Date.now();
      if (currentTime - startTime > maxDuration) {
        cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        return;
      }
      
      // Take screenshot
      cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-step-${screenshotCount - 1}`, { capture: 'viewport' });
      screenshotCount++;
      
      // Smart interaction logic
      cy.get('body').then($body => {
        // Priority 1: Continue/OK/Next buttons
        if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').first().click({ force: true });
        }
        // Priority 2: Multiple choice buttons
        else if ($body.find('#jspsych-html-multi-response-btngroup button').length >= 2) {
          const buttons = $body.find('#jspsych-html-multi-response-btngroup button');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('#jspsych-html-multi-response-btngroup button').eq(randomIndex).click({ force: true });
        }
        // Priority 3: Any enabled buttons
        else if ($body.find('button:not([disabled])').length > 0) {
          const buttons = $body.find('button:not([disabled])');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('button:not([disabled])').eq(randomIndex).click({ force: true });
        }
        // Priority 4: Sliders (for math tasks)
        else if ($body.find('input[type="range"]').length > 0) {
          cy.get('input[type="range"]').first().then($slider => {
            const min = $slider.attr('min') || 0;
            const max = $slider.attr('max') || 100;
            const randomValue = Math.floor(Math.random() * (max - min + 1)) + parseInt(min);
            cy.wrap($slider).invoke('val', randomValue).trigger('input').trigger('change');
          });
        }
        // Priority 5: Clickable elements
        else if ($body.find('.clickable, [onclick]').length > 0) {
          cy.get('.clickable, [onclick]').first().click({ force: true });
        }
        // Fallback: Click center of screen
        else {
          cy.get('body').click(500, 300, { force: true });
        }
      });
      
      // Continue loop
      cy.wait(screenshotInterval).then(() => {
        if (Date.now() - startTime < maxDuration) {
          captureAndInteract();
        } else {
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        }
      });
    }
    
    // Start the capture loop
    cy.wait(3000).then(() => {
      captureAndInteract();
    });
  });
});
