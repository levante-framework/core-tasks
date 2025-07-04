describe('egma-math Robust 150+ Test', () => {
  it('should capture 150+ screenshots with robust error handling', () => {
    // Handle application errors gracefully
    Cypress.on('uncaught:exception', (err, runnable) => {
      cy.log('Handled error: ' + err.message);
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
        'http://localhost:8080/?task=egma-math&trials=50&practiceTrials=5'
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
          
          // Mock screen orientation
          Object.defineProperty(win.screen, 'orientation', {
            get: () => ({ lock: cy.stub().resolves() })
          });
        }
      });
    };

    visitPage();
    
    // Take initial screenshot
    cy.screenshot('000-start');
    
    // Take screenshots with robust error handling
    for (let i = 1; i <= 170; i++) {
      cy.wait(1500); // Slightly faster than before
      
      // Check if we're stuck on the same screen
      cy.get('body').then(($body) => {
        const currentText = $body.text().substring(0, 200);
        
        if (currentText === lastScreenText) {
          stuckCount++;
          cy.log(`Stuck count: ${stuckCount}`);
          
          if (stuckCount >= 5) {
            cy.log('Detected stuck screen, attempting restart');
            stuckCount = 0;
            visitPage();
            cy.wait(2000);
          }
        } else {
          stuckCount = 0;
          lastScreenText = currentText;
        }
      });
      
      // Multiple interaction strategies with error handling
      cy.get('body').then(($body) => {
        try {
          // Strategy 1: Primary navigation buttons
          if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').length > 0) {
            cy.log('Strategy 1: Navigation buttons');
            cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin"), button:contains("Submit")').first().click({ force: true });
          }
          // Strategy 2: Slider interactions
          else if ($body.find('input[type="range"], .number-line-4afc-slider, #jspsych-html-slider-response-response').length > 0) {
            cy.log('Strategy 2: Slider interaction');
            cy.get('input[type="range"], .number-line-4afc-slider, #jspsych-html-slider-response-response').first().then(($slider) => {
              const randomValue = Math.floor(Math.random() * 101);
              cy.wrap($slider).invoke('val', randomValue).trigger('input').trigger('change');
            });
            // Also try clicking a submit button after slider
            cy.get('button:contains("Submit"), button:contains("Continue"), button:contains("Next")').first().click({ force: true }).then(() => {}, () => {});
          }
          // Strategy 3: Number line buttons
          else if ($body.find('#slider-btn-container button, .slider-button').length > 0) {
            cy.log('Strategy 3: Number line buttons');
            cy.get('#slider-btn-container button, .slider-button').then(($buttons) => {
              const randomIndex = Math.floor(Math.random() * $buttons.length);
              cy.wrap($buttons.eq(randomIndex)).click({ force: true });
            });
          }
          // Strategy 4: Multiple choice and response buttons
          else if ($body.find('[data-choice], .choice-button, .response-button, button[data-response]').length > 0) {
            cy.log('Strategy 4: Multiple choice buttons');
            cy.get('[data-choice], .choice-button, .response-button, button[data-response]').then(($choices) => {
              const randomIndex = Math.floor(Math.random() * $choices.length);
              cy.wrap($choices.eq(randomIndex)).click({ force: true });
            });
          }
          // Strategy 5: Input fields
          else if ($body.find('input[type="number"], input[type="text"], textarea').length > 0) {
            cy.log('Strategy 5: Input fields');
            cy.get('input[type="number"], input[type="text"], textarea').first().then(($input) => {
              const randomNumber = Math.floor(Math.random() * 15) + 1;
              cy.wrap($input).clear().type(randomNumber.toString());
              // Try to submit after typing
              cy.get('button:contains("Submit"), button:contains("Continue"), button:contains("Next")').first().click({ force: true }).then(() => {}, () => {});
            });
          }
          // Strategy 6: Any clickable elements
          else if ($body.find('button:not([disabled]), [onclick], [data-click]').length > 0) {
            cy.log('Strategy 6: Clickable elements');
            cy.get('button:not([disabled]), [onclick], [data-click]').then(($elements) => {
              const randomIndex = Math.floor(Math.random() * $elements.length);
              cy.wrap($elements.eq(randomIndex)).click({ force: true });
            });
          }
                     // Strategy 7: Keyboard interactions
           else {
             cy.log('Strategy 7: Keyboard interactions');
             const keys = ['{enter}', ' ', '{rightArrow}', '{leftArrow}'];
             const randomKey = keys[Math.floor(Math.random() * keys.length)];
             cy.get('body').type(randomKey);
           }
        } catch (error) {
          cy.log('Interaction error: ' + error.message);
          // Try a simple click on the body as fallback
          cy.get('body').click({ force: true });
        }
      });
      
      // Short wait after interaction
      cy.wait(200);
      
      // Take screenshot with error handling
      try {
        cy.screenshot(`${i.toString().padStart(3, '0')}-step-${i}`);
      } catch (error) {
        cy.log('Screenshot error: ' + error.message);
      }
      
      // Progress logging
      if (i % 20 === 0) {
        cy.log(`Progress: ${i}/170 screenshots (${Math.round((i/170)*100)}%)`);
      }
      
      // Periodic restart to prevent getting stuck
      if (i % 60 === 0 && i < 170) {
        cy.log('Periodic restart to prevent getting stuck');
        visitPage();
        cy.wait(2000);
      }
    }
    
    // Final screenshot
    cy.screenshot('999-final');
    cy.log('Robust test completed! Target: 170+ screenshots');
  });
}); 