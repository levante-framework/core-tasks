const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Proper Gameplay', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('captures memory game with proper gameplay interactions', () => {
    // Visit with fullscreen mocking
    cy.visit(memory_game_url, {
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

    // Wait for OK button and start fullscreen
    cy.contains('OK', { timeout: 30000 }).should('be.visible');
    takeScreenshot('02-ok-button-visible');

    cy.contains('OK').click({ force: true });
    takeScreenshot('03-after-fullscreen-start');

    // Now follow the memory game pattern
    playMemoryGame();
  });

  function playMemoryGame() {
    // Handle instructions and game screens
    cy.get('.jspsych-content', { timeout: 10000 }).then((content) => {
      takeScreenshot('04-jspsych-content-loaded');

      const corsiBlocks = content.find('.jspsych-corsi-block');

      if (corsiBlocks.length === 0) {
        // This is an instructions screen
        takeScreenshot('05-instructions-screen');

        // Look for OK button to continue
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("OK")').length > 0) {
            cy.contains('OK').click({ force: true });
            takeScreenshot('06-clicked-ok-in-instructions');
            cy.wait(3000);

            // Recursively continue the game
            playMemoryGame();
          } else {
            // Try other common continue buttons
            const continueButtons = $body.find(
              'button:contains("Continue"), button:contains("Next"), button:contains("Start")',
            );
            if (continueButtons.length > 0) {
              cy.wrap(continueButtons.first()).click({ force: true });
              takeScreenshot('07-clicked-continue-button');
              cy.wait(3000);
              playMemoryGame();
            } else {
              takeScreenshot('08-no-continue-buttons-found');
              cy.wait(5000);
              playMemoryGame();
            }
          }
        });
      } else {
        // This is the actual memory game with Corsi blocks
        takeScreenshot('09-corsi-blocks-found');

        // Wait for sequence display to finish
        cy.wait(5000);
        takeScreenshot('10-after-sequence-display');

        // Try to play the memory game
        playMemoryTrial(corsiBlocks);
      }
    });
  }

  function playMemoryTrial(blocks) {
    takeScreenshot('11-starting-memory-trial');

    // Wait for the display phase to end (when 'p' element disappears)
    cy.get('p', { timeout: 20000 }).should('not.exist');
    takeScreenshot('12-display-phase-ended');

    // Wait for response phase (when 'p' element reappears)
    cy.get('p', { timeout: 10000 }).should('exist');
    takeScreenshot('13-response-phase-started');

    // Click on some blocks (since we don't have the correct sequence)
    // Just click a few blocks to see what happens
    for (let i = 0; i < Math.min(3, blocks.length); i++) {
      cy.wrap(blocks[i]).click({ force: true });
      takeScreenshot(`14-clicked-block-${i + 1}`);
      cy.wait(1000);
    }

    takeScreenshot('15-after-clicking-blocks');
    cy.wait(5000);

    // Continue the game loop
    playMemoryGame();
  }
});
