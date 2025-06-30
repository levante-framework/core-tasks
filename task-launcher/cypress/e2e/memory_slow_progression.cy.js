const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Slow Progression', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('captures memory game with proper progression timing', () => {
    // Visit with fullscreen mocking
    cy.visit(memory_game_url, {
      onBeforeLoad: (win) => {
        // Mock fullscreen API
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

    // Wait for page to load
    cy.wait(5000);
    takeScreenshot('02-page-loaded');

    // Click OK button to start
    cy.contains('OK', { timeout: 10000 }).should('be.visible');
    takeScreenshot('03-ok-button-visible');

    cy.contains('OK').click({ force: true });
    takeScreenshot('04-after-ok-click');

    // Wait longer for game to initialize
    cy.wait(10000);
    takeScreenshot('05-after-long-wait');

    // Look for and interact with any "Continue" or "Next" buttons
    cy.get('body').then(($body) => {
      const continueButtons = $body.find('button:contains("Continue"), button:contains("Next"), button:contains("Start"), button:contains("Begin")');
      if (continueButtons.length > 0) {
        cy.wrap(continueButtons.first()).click({ force: true });
        takeScreenshot('06-clicked-continue');
        cy.wait(5000);
      }
    });

    // Try pressing common keys that might advance the game
    cy.get('body').type(' '); // Spacebar
    takeScreenshot('07-after-spacebar');
    cy.wait(3000);

    cy.get('body').type('{enter}'); // Enter key
    takeScreenshot('08-after-enter');
    cy.wait(3000);

    // Look for any clickable game elements and interact with them
    cy.get('body').then(($body) => {
      // Look for memory cards, game buttons, or interactive elements
      const gameElements = $body.find('canvas, svg, [class*="card"], [class*="memory"], [class*="game"], button:visible');
      
      if (gameElements.length > 0) {
        takeScreenshot('09-found-game-elements');
        
        // Click on different elements to try to progress the game
        gameElements.each((index, element) => {
          if (index < 3) { // Only click first 3 elements
            cy.wrap(element).click({ force: true });
            cy.wait(5000); // Wait 5 seconds between clicks
            takeScreenshot(`10-clicked-element-${index + 1}`);
          }
        });
      }
    });

    // Wait much longer periods and take screenshots to see if game auto-progresses
    for (let i = 0; i < 5; i++) {
      cy.wait(15000); // Wait 15 seconds between screenshots
      takeScreenshot(`11-long-wait-${i + 1}`);
      
      // Try clicking anywhere on the screen
      cy.get('body').click({ force: true });
      cy.wait(2000);
      takeScreenshot(`12-after-body-click-${i + 1}`);
    }

    takeScreenshot('13-final-state');
  });
}); 