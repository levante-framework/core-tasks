describe('egma-math Slider-Focused Task Capture', () => {
  it('should capture screenshots with proper slider and number line interactions', () => {
    const taskName = 'egma-math';
    const screenshotInterval = 6000; // 6 seconds
    const maxDuration = 8 * 60 * 1000; // 8 minutes
    let screenshotCount = 0;
    const endMessages = [/thank you/i, /task complete/i, /all done/i, /finished/i, /great job/i];

    // Handle application errors gracefully
    Cypress.on('uncaught:exception', (err, runnable) => {
      cy.log('Handled error: ' + err.message);
      return false; // Don't fail the test
    });

    cy.visit(`http://localhost:8080/?task=${taskName}`, {
      onBeforeLoad(win) {
        // Enhanced fullscreen mocking
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
        win.screen.orientation = {
          lock: cy.stub().resolves(),
          unlock: cy.stub().resolves()
        };
      }
    });

    // Take initial screenshot
    cy.screenshot('00-start');
    
    // Main interaction loop
    const startTime = Date.now();
    while (Date.now() - startTime < maxDuration) {
      cy.wait(screenshotInterval);
      
      // Check for end conditions
      cy.get('body').then(($body) => {
        const bodyText = $body.text().toLowerCase();
        const isComplete = endMessages.some(msg => msg.test(bodyText));
        
        if (isComplete) {
          cy.log('Task completed!');
          return false; // Exit loop
        }
      });
      
      // EGMA-specific interaction strategy
      cy.get('body').then(($body) => {
        let interactionMade = false;
        
        // Strategy 1: Slider interactions (primary EGMA interaction)
        if (!interactionMade && $body.find('#jspsych-html-slider-response-response, .number-line-4afc-slider').length > 0) {
          cy.log('Strategy 1: Slider interaction');
          cy.get('#jspsych-html-slider-response-response, .number-line-4afc-slider').first().then(($slider) => {
            // Set slider to a random value between 0 and 100
            const randomValue = Math.floor(Math.random() * 101);
            cy.wrap($slider).invoke('val', randomValue).trigger('input').trigger('change');
            interactionMade = true;
            cy.wait(1000);
          });
        }
        
        // Strategy 2: Number line button interactions
        if (!interactionMade && $body.find('#slider-btn-container button').length > 0) {
          cy.log('Strategy 2: Number line button interaction');
          cy.get('#slider-btn-container button').then(($buttons) => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons.eq(randomIndex)).click();
            interactionMade = true;
            cy.wait(1000);
          });
        }
        
        // Strategy 3: Standard navigation buttons
        if (!interactionMade && $body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin")').length > 0) {
          cy.log('Strategy 3: Navigation buttons');
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin")').first().click();
          interactionMade = true;
          cy.wait(1000);
        }
        
        // Strategy 4: Multiple choice or response buttons
        if (!interactionMade && $body.find('[data-choice], .choice-button, .response-button').length > 0) {
          cy.log('Strategy 4: Multiple choice buttons');
          cy.get('[data-choice], .choice-button, .response-button').then(($choices) => {
            const randomIndex = Math.floor(Math.random() * $choices.length);
            cy.wrap($choices.eq(randomIndex)).click();
            interactionMade = true;
            cy.wait(1000);
          });
        }
        
        // Strategy 5: Number input fields with random values
        if (!interactionMade && $body.find('input[type="number"], input[type="text"]').length > 0) {
          cy.log('Strategy 5: Number input fields');
          cy.get('input[type="number"], input[type="text"]').first().then(($input) => {
            const randomNumber = Math.floor(Math.random() * 100) + 1;
            cy.wrap($input).clear().type(randomNumber.toString());
            interactionMade = true;
            cy.wait(1000);
          });
        }
        
        // Strategy 6: Any enabled buttons as fallback
        if (!interactionMade && $body.find('button:not([disabled])').length > 0) {
          cy.log('Strategy 6: Any enabled button');
          cy.get('button:not([disabled])').then(($buttons) => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons.eq(randomIndex)).click();
            interactionMade = true;
            cy.wait(1000);
          });
        }
        
        // Strategy 7: Click anywhere on screen as last resort
        if (!interactionMade) {
          cy.log('Strategy 7: Click anywhere on screen');
          cy.get('body').click(Math.floor(Math.random() * 800) + 100, Math.floor(Math.random() * 600) + 100);
          cy.wait(1000);
        }
      });
      
      // Take screenshot
      screenshotCount++;
      cy.screenshot(`${screenshotCount.toString().padStart(2, '0')}-step-${screenshotCount}`);
    }
    
    // Final screenshot
    cy.screenshot('99-final');
  });
}); 