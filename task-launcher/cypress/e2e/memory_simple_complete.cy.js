const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Simple Complete Run', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('runs memory game with regular screenshots', () => {
    // Visit with fullscreen mocking
    cy.visit(memory_game_url, {
      timeout: 60000,
      onBeforeLoad: (win) => {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true,
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true,
        });
      },
    });

    takeScreenshot('01-initial-load');

    // Start the game
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    cy.contains('OK').click({ force: true });
    takeScreenshot('02-game-started');

    // Run for 2 minutes with regular interactions
    runGameLoop();
  });

  function runGameLoop() {
    // Take screenshot every 10 seconds and interact with game
    for (let i = 0; i < 12; i++) {
      // 12 * 10 seconds = 2 minutes
      cy.wait(10000); // Wait 10 seconds

      takeScreenshot(`${(i + 3).toString().padStart(2, '0')}-game-state-${i + 1}`);

      // Try to interact with any visible buttons or elements
      cy.get('body').then(($body) => {
        // Click OK buttons if present
        const okButton = $body.find('button:contains("OK")');
        if (okButton.length > 0) {
          cy.contains('OK').first().click({ force: true });
        }

        // Click Continue/Next buttons if present
        const continueButton = $body.find('button:contains("Continue"), button:contains("Next")');
        if (continueButton.length > 0) {
          cy.get('button')
            .contains(/Continue|Next/)
            .first()
            .click({ force: true });
        }

        // Click memory blocks if present
        const corsiBlocks = $body.find('.jspsych-corsi-block');
        if (corsiBlocks.length > 0) {
          // Click first 2 blocks
          cy.get('.jspsych-corsi-block').eq(0).click({ force: true });
          cy.wait(1000);
          if (corsiBlocks.length > 1) {
            cy.get('.jspsych-corsi-block').eq(1).click({ force: true });
          }
        }
      });
    }

    takeScreenshot('99-final-state');
  }
});
