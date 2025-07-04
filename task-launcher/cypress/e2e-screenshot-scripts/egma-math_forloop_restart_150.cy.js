describe('egma-math For Loop Restart 150+ Test', () => {
  it('should capture 150+ unique screenshots using for loop with restart detection', () => {
    // Handle application errors gracefully
    Cypress.on('uncaught:exception', (err, runnable) => {
      return false; // Don't fail the test
    });

    let visitCount = 0;
    let lastScreenText = '';
    let stuckCount = 0;
    
    const visitPage = () => {
      visitCount++;
      cy.log(`Visit attempt ${visitCount}`);
      
      const urls = [
        'http://localhost:8080/?task=egma-math',
        'http://localhost:8080/?task=egma-math&skip=true',
        'http://localhost:8080/?task=egma-math&skipInstructions=true',
        'http://localhost:8080/?task=egma-math&trials=15&practiceTrials=2',
        'http://localhost:8080/?task=egma-math&heavyInstructions=false&skip=true',
        'http://localhost:8080/?task=egma-math&practiceTrials=0&trials=8'
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
    
    // Take screenshots with for loop and restart detection
    for (let i = 1; i <= 180; i++) {
      cy.wait(300);
      
      // Check if we're stuck and restart if needed
      cy.get('body').then(($body) => {
        const currentText = $body.text().substring(0, 200);
        const buttonCount = $body.find('button').length;
        const inputCount = $body.find('input').length;
        const stateSignature = `${currentText.substring(0, 80)}-${buttonCount}-${inputCount}`;
        
        if (stateSignature === lastScreenText) {
          stuckCount++;
          if (stuckCount >= 3) {
            cy.log('Detected stuck screen, restarting');
            stuckCount = 0;
            visitPage();
            cy.wait(1500);
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
            const randomNumber = Math.floor(Math.random() * 12) + 1;
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
      
      cy.wait(150);
      
      // Take screenshot
      cy.screenshot(`${i.toString().padStart(3, '0')}-step-${i}`);
      
      // Progress logging
      if (i % 30 === 0) {
        cy.log(`Progress: ${i}/180 screenshots`);
      }
      
      // Periodic restart to ensure variety
      if (i % 50 === 0 && i < 180) {
        cy.log('Periodic restart for variety');
        visitPage();
        cy.wait(1000);
      }
    }
    
    // Final screenshot
    cy.screenshot('999-final');
    cy.log('For loop restart test completed! Target: 180+ screenshots');
  });
}); 