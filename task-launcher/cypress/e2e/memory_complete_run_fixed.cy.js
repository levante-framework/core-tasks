const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Complete Run Fixed', () => {
  let screenshotCounter = 1;
  let gameLoopCount = 0;
  const maxGameLoops = 50; // Increased to allow more trials

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('completes full memory game with fixed DOM handling', () => {
    // Visit with fullscreen mocking and extended timeout
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
      const bodyText = $body.text();
      if (
        bodyText.includes('Thank you!') ||
        bodyText.includes('complete') ||
        bodyText.includes('finished') ||
        bodyText.includes('Exit')
      ) {
        takeScreenshot('98-game-complete');

        // Click Exit if available
        if ($body.find('button:contains("Exit")').length > 0) {
          cy.contains('Exit').click({ force: true });
          takeScreenshot('99-clicked-exit');
        }
        return;
      }

      // Check if jspsych content exists
      cy.get('body').then(() => {
        cy.get('.jspsych-content', { timeout: 10000 })
          .should('exist')
          .then((content) => {
            const corsiBlocks = content.find('.jspsych-corsi-block');

            if (corsiBlocks.length === 0) {
              // Instructions screen - take screenshot every few instructions
              if (gameLoopCount % 5 === 0) {
                takeScreenshot(`03-instructions-${Math.floor(gameLoopCount / 5)}`);
              }

              // Click OK or continue buttons
              cy.get('body').then(($body) => {
                const okButton = $body.find('button:contains("OK")');
                const continueButton = $body.find('button:contains("Continue"), button:contains("Next")');

                if (okButton.length > 0) {
                  cy.contains('OK').click({ force: true });
                } else if (continueButton.length > 0) {
                  cy.get('button')
                    .contains(/Continue|Next/)
                    .first()
                    .click({ force: true });
                }

                cy.wait(3000);
                playCompleteMemoryGame();
              });
            } else {
              // Actual memory game trial
              if (gameLoopCount % 3 === 0) {
                takeScreenshot(`04-memory-trial-${Math.floor(gameLoopCount / 3)}`);
              }

              // Play the memory trial with fixed DOM handling
              playMemoryTrialFixed();
            }
          });
      });
    });
  }

  function playMemoryTrialFixed() {
    // Wait for sequence display to end (when p element disappears)
    cy.get('body').then(($body) => {
      if ($body.find('p').length > 0) {
        cy.get('p', { timeout: 30000 }).should('not.exist');
      }
    });

    // Wait for response phase (when p element appears again)
    cy.get('p', { timeout: 15000 }).should('exist');

    // Take screenshot of response phase
    if (gameLoopCount % 3 === 0) {
      takeScreenshot(`05-response-phase-${Math.floor(gameLoopCount / 3)}`);
    }

    // Check if blocks exist and click them
    cy.get('body').then(($body) => {
      const blocks = $body.find('.jspsych-corsi-block');

      if (blocks.length > 0) {
        // Click first few blocks
        const numClicks = Math.min(2, blocks.length);

        for (let i = 0; i < numClicks; i++) {
          cy.get('.jspsych-corsi-block').eq(i).click({ force: true });
          cy.wait(800);
        }
      }

      // Wait for trial to process
      cy.wait(4000);

      // Continue the game
      playCompleteMemoryGame();
    });
  }
});
