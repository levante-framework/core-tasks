describe('egma-math Recreate Success 150+ Test', () => {
  it('should capture 150+ screenshots with maximum speed', () => {
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
    
    // Take 220 screenshots with maximum speed (exact recreation)
    for (let i = 1; i <= 220; i++) {
      cy.wait(200); // Reduced to 0.2 seconds
      
      // Maximum speed interaction strategy
      cy.get('body').then(($body) => {
        // Strategy 1: Navigation buttons (highest priority)
        if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').first().click();
        }
        // Strategy 2: Slider interactions
        else if ($body.find('input[type="range"]').length > 0) {
          cy.get('input[type="range"]').first().invoke('val', 25).trigger('change');
          cy.get('button').contains(/Submit|Continue|Next/i).first().click().then(() => {}, () => {});
        }
        // Strategy 3: Multiple choice buttons
        else if ($body.find('[data-choice], .choice-button, .response-button').length > 0) {
          cy.get('[data-choice], .choice-button, .response-button').first().click();
        }
        // Strategy 4: Input fields
        else if ($body.find('input[type="number"], input[type="text"]').length > 0) {
          cy.get('input[type="number"], input[type="text"]').first().type('1');
          cy.get('button').contains(/Submit|Continue|Next/i).first().click().then(() => {}, () => {});
        }
        // Strategy 5: Any enabled button
        else if ($body.find('button:not([disabled])').length > 0) {
          cy.get('button:not([disabled])').first().click();
        }
        // Strategy 6: Press Enter
        else {
          cy.get('body').type('{enter}');
        }
      });
      
      // Take screenshot immediately
      cy.screenshot(`${i.toString().padStart(3, '0')}-step-${i}`);
      
      // Progress logging every 50 screenshots
      if (i % 50 === 0) {
        cy.log(`Progress: ${i}/220 screenshots`);
      }
    }
    
    // Final screenshot
    cy.screenshot('999-final');
    cy.log('Recreated successful test! Captured 220+ screenshots');
  });
}); 