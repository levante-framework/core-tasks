describe('egma-math Simple Wait 150+ Test', () => {
  it('should capture 150+ screenshots with simple loading waits', () => {
    // Handle application errors gracefully
    Cypress.on('uncaught:exception', (err, runnable) => {
      return false; // Don't fail the test
    });

    cy.visit('http://localhost:8080/?task=egma-math&trials=50&practiceTrials=5', {
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
    
    // Take screenshots with simple waits
    for (let i = 1; i <= 180; i++) {
      // Check for loading screens and wait longer if needed
      cy.get('body').then(($body) => {
        const bodyText = $body.text().toLowerCase();
        const hasLoadingIndicator = bodyText.includes('loading') || 
                                   bodyText.includes('please wait') || 
                                   $body.find('.loading, .spinner, [class*="load"]').length > 0;
        
        if (hasLoadingIndicator) {
          cy.log(`Loading screen detected at step ${i}, waiting longer...`);
          cy.wait(3000); // Wait 3 seconds for loading
        } else {
          cy.wait(500); // Normal wait
        }
      });
      
      // Simple interaction strategy
      cy.get('body').then(($body) => {
        // Strategy 1: Navigation buttons
        if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').first().click();
        }
        // Strategy 2: Practice/Test transition buttons
        else if ($body.find('button:contains("Start Test"), button:contains("Begin Test"), button:contains("Continue to Test")').length > 0) {
          cy.log('Found test transition button');
          cy.get('button:contains("Start Test"), button:contains("Begin Test"), button:contains("Continue to Test")').first().click();
        }
        // Strategy 3: Slider interactions
        else if ($body.find('input[type="range"]').length > 0) {
          cy.get('input[type="range"]').first().then(($slider) => {
            const randomValue = Math.floor(Math.random() * 101);
            cy.wrap($slider).invoke('val', randomValue).trigger('input').trigger('change');
          });
          cy.get('button').contains(/Submit|Continue|Next/i).first().click().then(() => {}, () => {});
        }
        // Strategy 4: Number line buttons
        else if ($body.find('#slider-btn-container button').length > 0) {
          cy.get('#slider-btn-container button').then(($buttons) => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons.eq(randomIndex)).click();
          });
        }
        // Strategy 5: Multiple choice buttons
        else if ($body.find('[data-choice], .choice-button, .response-button').length > 0) {
          cy.get('[data-choice], .choice-button, .response-button').then(($choices) => {
            const randomIndex = Math.floor(Math.random() * $choices.length);
            cy.wrap($choices.eq(randomIndex)).click();
          });
        }
        // Strategy 6: Input fields
        else if ($body.find('input[type="number"], input[type="text"]').length > 0) {
          cy.get('input[type="number"], input[type="text"]').first().then(($input) => {
            const randomNumber = Math.floor(Math.random() * 8) + 1;
            cy.wrap($input).clear().type(randomNumber.toString());
          });
          cy.get('button').contains(/Submit|Continue|Next/i).first().click().then(() => {}, () => {});
        }
        // Strategy 7: Any enabled button
        else if ($body.find('button:not([disabled])').length > 0) {
          cy.get('button:not([disabled])').then(($buttons) => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons.eq(randomIndex)).click();
          });
        }
        // Strategy 8: Press Enter
        else {
          cy.get('body').type('{enter}');
        }
      });
      
      cy.wait(300);
      
      // Take screenshot
      cy.screenshot(`${i.toString().padStart(3, '0')}-step-${i}`);
      
      // Progress logging
      if (i % 20 === 0) {
        cy.log(`Progress: ${i}/180 screenshots`);
      }
    }
    
    // Final screenshot
    cy.screenshot('999-final');
    cy.log('Simple wait test completed! Target: 180+ screenshots');
  });
}); 