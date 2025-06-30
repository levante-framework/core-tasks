const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Full Complete Run', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('runs complete memory game from start to finish', () => {
    // Visit with fullscreen mocking and extended timeout
    cy.visit(memory_game_url, {
      timeout: 60000,
      onBeforeLoad: (win) => {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
      }
    });

    takeScreenshot('01-initial-load');

    // Start the game
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    cy.contains('OK').click({ force: true });
    takeScreenshot('02-game-started');

    // Run the full game - extended to 5 minutes with more frequent screenshots
    runFullGameLoop();
  });

  function runFullGameLoop() {
    // Run for 5 minutes with screenshots every 5 seconds
    for (let i = 0; i < 60; i++) { // 60 * 5 seconds = 5 minutes
      cy.wait(5000); // Wait 5 seconds between interactions
      
      takeScreenshot(`${(i + 3).toString().padStart(3, '0')}-game-${i + 1}`);
      
      // Comprehensive interaction with all possible game elements
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        
        // Check for game completion
        if (bodyText.includes('Thank you') || 
            bodyText.includes('complete') || 
            bodyText.includes('finished') ||
            bodyText.includes('Exit') ||
            bodyText.includes('done')) {
          takeScreenshot('998-game-completed');
          
          // Click Exit/Done button if present
          if ($body.find('button:contains("Exit"), button:contains("Done")').length > 0) {
            cy.get('button').contains(/Exit|Done/).first().click({ force: true });
            takeScreenshot('999-clicked-exit');
          }
          return; // End the game
        }
        
        // Interact with OK buttons (most common) - make optional
        const okButton = $body.find('button:contains("OK")');
        if (okButton.length > 0) {
          cy.contains('OK').first().click({ force: true });
          cy.log(`Clicked OK button at iteration ${i + 1}`);
        }
        
        // Interact with Continue/Next buttons - make optional
        const continueButton = $body.find('button:contains("Continue"), button:contains("Next"), button:contains("Start")');
        if (continueButton.length > 0) {
          cy.get('button').contains(/Continue|Next|Start/).first().click({ force: true });
          cy.log(`Clicked Continue/Next button at iteration ${i + 1}`);
        }
        
        // Interact with memory blocks (Corsi blocks) - make completely optional
        const corsiBlocks = $body.find('.jspsych-corsi-block');
        if (corsiBlocks.length > 0) {
          cy.log(`Found ${corsiBlocks.length} memory blocks at iteration ${i + 1}`);
          
          // Click multiple blocks to attempt the memory sequence
          const numClicks = Math.min(4, corsiBlocks.length); // Try up to 4 blocks
          
          for (let blockIndex = 0; blockIndex < numClicks; blockIndex++) {
            // Use then() to make this completely optional
            cy.get('body').then(($currentBody) => {
              const currentBlocks = $currentBody.find('.jspsych-corsi-block');
              if (currentBlocks.length > blockIndex) {
                cy.get('.jspsych-corsi-block').eq(blockIndex).click({ force: true });
                cy.wait(800); // Wait between block clicks
              }
            });
          }
          
          cy.log(`Attempted to click ${numClicks} memory blocks at iteration ${i + 1}`);
        }
        
        // Look for any other clickable buttons - make optional
        const otherButtons = $body.find('button').not(':contains("OK"):contains("Continue"):contains("Next"):contains("Start")');
        if (otherButtons.length > 0 && corsiBlocks.length === 0) {
          cy.get('button').first().click({ force: true });
          cy.log(`Clicked other button at iteration ${i + 1}`);
        }
        
        // Check for input fields (in case there are text inputs) - make optional
        const inputs = $body.find('input[type="text"], input[type="number"]');
        if (inputs.length > 0) {
          cy.get('input').first().type('test');
          cy.log(`Filled input field at iteration ${i + 1}`);
        }
      });
      
      // Log progress every 20 iterations (100 seconds)
      if ((i + 1) % 20 === 0) {
        cy.log(`Progress: ${i + 1}/60 iterations completed (${((i + 1) * 5 / 60).toFixed(1)} minutes)`);
      }
    }
    
    takeScreenshot('997-timeout-reached');
    cy.log('Full 5-minute test completed');
  }
}); 