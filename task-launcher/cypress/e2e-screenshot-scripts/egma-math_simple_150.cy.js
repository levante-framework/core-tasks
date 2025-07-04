describe('egma-math Simple 150+ Test', () => {
  it('should capture 150+ screenshots with simple approach', () => {
    // Handle application errors gracefully
    Cypress.on('uncaught:exception', (err, runnable) => {
      return false; // Don't fail the test
    });

    cy.visit('http://localhost:8080/?task=egma-math', {
      onBeforeLoad(win) {
        // Basic fullscreen mocking
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
      }
    });

    // Take initial screenshot
    cy.screenshot('000-start');
    
    // Take 160 screenshots with basic interactions
    for (let i = 1; i <= 160; i++) {
      cy.wait(1000); // 1 second wait
      
      // Simple interaction strategy
      cy.get('body').then(($body) => {
        // Strategy 1: Navigation buttons
        if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').first().click();
        }
        // Strategy 2: Slider interactions
        else if ($body.find('input[type="range"]').length > 0) {
          cy.get('input[type="range"]').first().then(($slider) => {
            const randomValue = Math.floor(Math.random() * 101);
            cy.wrap($slider).invoke('val', randomValue).trigger('input').trigger('change');
          });
          // Try to find submit button after slider
          cy.get('button:contains("Submit"), button:contains("Continue"), button:contains("Next")').first().click().then(() => {}, () => {});
        }
        // Strategy 3: Multiple choice buttons
        else if ($body.find('[data-choice], .choice-button, .response-button').length > 0) {
          cy.get('[data-choice], .choice-button, .response-button').then(($choices) => {
            const randomIndex = Math.floor(Math.random() * $choices.length);
            cy.wrap($choices.eq(randomIndex)).click();
          });
        }
        // Strategy 4: Input fields
        else if ($body.find('input[type="number"], input[type="text"]').length > 0) {
          cy.get('input[type="number"], input[type="text"]').first().then(($input) => {
            const randomNumber = Math.floor(Math.random() * 20) + 1;
            cy.wrap($input).clear().type(randomNumber.toString());
          });
          // Try to submit
          cy.get('button:contains("Submit"), button:contains("Continue"), button:contains("Next")').first().click().then(() => {}, () => {});
        }
        // Strategy 5: Any enabled button
        else if ($body.find('button:not([disabled])').length > 0) {
          cy.get('button:not([disabled])').then(($buttons) => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons.eq(randomIndex)).click();
          });
        }
        // Strategy 6: Press Enter
        else {
          cy.get('body').type('{enter}');
        }
      });
      
      // Short wait after interaction
      cy.wait(300);
      
      // Take screenshot
      cy.screenshot(`${i.toString().padStart(3, '0')}-step-${i}`);
      
      // Progress logging every 25 screenshots
      if (i % 25 === 0) {
        cy.log(`Progress: ${i}/160 screenshots`);
      }
    }
    
    // Final screenshot
    cy.screenshot('999-final');
    cy.log('Simple test completed! Captured 160+ screenshots');
  });
}); 