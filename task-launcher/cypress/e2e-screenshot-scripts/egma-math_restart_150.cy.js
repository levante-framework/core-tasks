describe('egma-math Restart Strategy 150+ Test', () => {
  it('should capture 150+ unique screenshots using restart strategy', () => {
    // Handle application errors gracefully
    Cypress.on('uncaught:exception', (err, runnable) => {
      return false; // Don't fail the test
    });

    let visitCount = 0;
    let lastScreenText = '';
    let stuckCount = 0;
    let screenshotCount = 0;
    
    const visitPage = () => {
      visitCount++;
      cy.log(`Visit attempt ${visitCount}`);
      
      const urls = [
        'http://localhost:8080/?task=egma-math',
        'http://localhost:8080/?task=egma-math&skip=true',
        'http://localhost:8080/?task=egma-math&skipInstructions=true',
        'http://localhost:8080/?task=egma-math&trials=20&practiceTrials=2',
        'http://localhost:8080/?task=egma-math&heavyInstructions=false&skip=true',
        'http://localhost:8080/?task=egma-math&practiceTrials=0&trials=10'
      ];
      
      const url = urls[(visitCount - 1) % urls.length];
      
      cy.visit(url, {
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
        }
      });
    };

    visitPage();
    
    // Take initial screenshot
    cy.screenshot('000-start');
    screenshotCount++;
    
    // Take screenshots with restart strategy
    while (screenshotCount < 170) {
      cy.wait(400); // Fast but not too fast
      
      // Check if we're stuck on the same screen
      cy.get('body').then(($body) => {
        const currentText = $body.text().substring(0, 300);
        const buttonCount = $body.find('button').length;
        const inputCount = $body.find('input').length;
        const stateSignature = `${currentText.substring(0, 100)}-${buttonCount}-${inputCount}`;
        
        if (stateSignature === lastScreenText) {
          stuckCount++;
          cy.log(`Stuck count: ${stuckCount}`);
          
          if (stuckCount >= 3) {
            cy.log('Detected stuck screen, restarting with new URL');
            stuckCount = 0;
            visitPage();
            cy.wait(1000);
            return;
          }
        } else {
          stuckCount = 0;
          lastScreenText = stateSignature;
        }
      });
      
      // Interaction strategy
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
          cy.get('button').contains(/Submit|Continue|Next/i).first().click().then(() => {}, () => {});
        }
        // Strategy 3: Number line buttons
        else if ($body.find('#slider-btn-container button').length > 0) {
          cy.get('#slider-btn-container button').then(($buttons) => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons.eq(randomIndex)).click();
          });
        }
        // Strategy 4: Multiple choice buttons
        else if ($body.find('[data-choice], .choice-button, .response-button').length > 0) {
          cy.get('[data-choice], .choice-button, .response-button').then(($choices) => {
            const randomIndex = Math.floor(Math.random() * $choices.length);
            cy.wrap($choices.eq(randomIndex)).click();
          });
        }
        // Strategy 5: Input fields
        else if ($body.find('input[type="number"], input[type="text"]').length > 0) {
          cy.get('input[type="number"], input[type="text"]').first().then(($input) => {
            const randomNumber = Math.floor(Math.random() * 15) + 1;
            cy.wrap($input).clear().type(randomNumber.toString());
          });
          cy.get('button').contains(/Submit|Continue|Next/i).first().click().then(() => {}, () => {});
        }
        // Strategy 6: Any enabled button
        else if ($body.find('button:not([disabled])').length > 0) {
          cy.get('button:not([disabled])').then(($buttons) => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons.eq(randomIndex)).click();
          });
        }
        // Strategy 7: Press Enter
        else {
          cy.get('body').type('{enter}');
        }
      });
      
      cy.wait(200);
      
      // Take screenshot
      screenshotCount++;
      cy.screenshot(`${screenshotCount.toString().padStart(3, '0')}-step-${screenshotCount}`);
      
      // Progress logging
      if (screenshotCount % 25 === 0) {
        cy.log(`Progress: ${screenshotCount}/170 screenshots`);
      }
    }
    
    // Final screenshot
    cy.screenshot('999-final');
    cy.log('Restart strategy test completed! Target: 170+ screenshots');
  });
}); 