const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Complete Run', () => {
  let screenshotCounter = 1;
  let gameLoopCount = 0;
  const maxGameLoops = 20; // Prevent infinite loops

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('completes full memory game with strategic screenshots', () => {
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

    // Run the complete memory game
    playCompleteMemoryGame();
  });

  function playCompleteMemoryGame() {
    gameLoopCount++;
    
    if (gameLoopCount > maxGameLoops) {
      takeScreenshot('99-max-loops-reached');
      return;
    }

    cy.get('body', { timeout: 30000 }).then(($body) => {
      // Check for end screen
      if ($body.find('p,h1').text().includes('Thank you!') || 
          $body.find('p,h1').text().includes('complete') ||
          $body.find('p,h1').text().includes('finished')) {
        takeScreenshot('98-game-complete');
        return;
      }

      // Look for jspsych content
      cy.get('.jspsych-content', { timeout: 15000 }).then((content) => {
        const corsiBlocks = content.find('.jspsych-corsi-block');
        
        if (corsiBlocks.length === 0) {
          // Instructions screen - take screenshot every few instructions
          if (gameLoopCount % 3 === 0) {
            takeScreenshot(`03-instructions-${Math.floor(gameLoopCount / 3)}`);
          }
          
          // Click OK or continue buttons
          cy.get('body').then(($body) => {
            const okButton = $body.find('button:contains("OK")');
            const continueButton = $body.find('button:contains("Continue"), button:contains("Next")');
            
            if (okButton.length > 0) {
              cy.wrap(okButton.first()).click({ force: true });
            } else if (continueButton.length > 0) {
              cy.wrap(continueButton.first()).click({ force: true });
            }
            
            cy.wait(2000);
            playCompleteMemoryGame();
          });
          
        } else {
          // Actual memory game trial
          takeScreenshot(`04-memory-trial-${Math.floor(gameLoopCount / 5)}`);
          
          // Play the memory trial
          playMemoryTrial(corsiBlocks);
        }
      });
    });
  }

  function playMemoryTrial(blocks) {
    // Wait for sequence display to end
    cy.get('p', { timeout: 30000 }).should('not.exist');
    
    // Wait for response phase
    cy.get('p', { timeout: 15000 }).should('exist');
    
    // Take screenshot of response phase
    takeScreenshot(`05-response-phase-${Math.floor(gameLoopCount / 5)}`);
    
    // Click blocks randomly (since we don't have correct sequence)
    const numClicks = Math.min(3, blocks.length);
    for (let i = 0; i < numClicks; i++) {
      const randomIndex = Math.floor(Math.random() * blocks.length);
      cy.wrap(blocks[randomIndex]).click({ force: true });
      cy.wait(500);
    }
    
    // Wait for trial to process
    cy.wait(3000);
    
    // Continue the game
    playCompleteMemoryGame();
  }
}); 