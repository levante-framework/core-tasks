describe('egma-math Simple Working Capture', () => {
  it('should capture screenshots with simple reliable interaction', () => {
    const taskName = 'egma-math';
    const screenshotInterval = 5000; // 5 seconds
    const maxDuration = 5 * 60 * 1000; // 5 minutes
    let screenshotCount = 0;
    const endMessages = [/thank you/i, /task complete/i, /all done/i, /finished/i, /great job/i];

    // Handle application errors gracefully
    Cypress.on('uncaught:exception', (err, runnable) => {
      cy.log('Handled error: ' + err.message);
      return false; // Don't fail the test
    });

    cy.visit(`http://localhost:8080/?task=${taskName}`, {
      onBeforeLoad(win) {
        // Basic fullscreen mocking
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

    cy.screenshot(`00-start`, { capture: 'viewport' });
    screenshotCount++;
    const startTime = Date.now();

    function captureAndInteract() {
      const currentTime = Date.now();
      if (currentTime - startTime > maxDuration) {
        cy.log('Time limit reached, ending test');
        cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        return;
      }
      
      // Take screenshot
      cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-step-${screenshotCount - 1}`, { capture: 'viewport' });
      screenshotCount++;
      cy.log(`Screenshot ${screenshotCount - 1} taken`);
      
      // Simple interaction logic
      cy.get('body').then($body => {
        const bodyText = $body.text().toLowerCase();
        
        // Check for end messages
        if (endMessages.some(re => re.test(bodyText))) {
          cy.log('END MESSAGE DETECTED');
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-end-detected`, { capture: 'viewport' });
          return;
        }
        
        // Simple interaction priority
        if (bodyText.includes('continue') || bodyText.includes('next') || bodyText.includes('start')) {
          cy.log('Clicking navigation button');
          cy.get('button:contains("Continue"), button:contains("Next"), button:contains("Start"), button:contains("OK"), button:contains("Begin")').first().click({ force: true });
        }
        // Try any visible buttons
        else if ($body.find('button:not([disabled]):visible').length > 0) {
          cy.log('Clicking first available button');
          cy.get('button:not([disabled]):visible').first().click({ force: true });
        }
        // Try number inputs
        else if ($body.find('input[type="number"], input[type="text"]').filter(':visible').length > 0) {
          cy.log('Filling number input');
          const randomNumber = Math.floor(Math.random() * 20) + 1;
          cy.get('input[type="number"], input[type="text"]').filter(':visible').first().clear().type(randomNumber.toString());
          cy.wait(1000);
          // Try to submit
          if ($body.find('button:not([disabled]):visible').length > 0) {
            cy.get('button:not([disabled]):visible').first().click({ force: true });
          }
        }
        // Try sliders/ranges
        else if ($body.find('input[type="range"]').length > 0) {
          cy.log('Setting slider value');
          const randomValue = Math.floor(Math.random() * 100) + 1;
          cy.get('input[type="range"]').first().invoke('val', randomValue).trigger('input').trigger('change');
          cy.wait(1000);
          if ($body.find('button:not([disabled]):visible').length > 0) {
            cy.get('button:not([disabled]):visible').first().click({ force: true });
          }
        }
        // Fallback: keyboard and click
        else {
          cy.log('Using fallback interaction');
          cy.get('body').type('{enter}');
          cy.wait(500);
          cy.get('body').click(500, 300, { force: true });
        }
      });
      
      // Continue after interval
      cy.wait(screenshotInterval).then(() => {
        if (Date.now() - startTime < maxDuration) {
          captureAndInteract();
        } else {
          cy.log('Max duration reached');
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        }
      });
    }
    
    // Start the capture loop
    cy.wait(3000).then(() => {
      cy.log('Starting capture loop');
      captureAndInteract();
    });
  });
}); 