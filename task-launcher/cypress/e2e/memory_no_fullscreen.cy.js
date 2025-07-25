const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Without Fullscreen', () => {
  let screenshotCounter = 1;

  // Handle any uncaught exceptions gracefully
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    // Don't fail the test on uncaught exceptions
    return false;
  });

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
    cy.wait(1000); // Wait between screenshots
  }

  it('captures memory game without fullscreen mode', () => {
    cy.visit(memory_game_url);
    takeScreenshot('01-initial-load');

    // Wait for page to fully load
    cy.wait(5000);
    takeScreenshot('02-page-loaded');

    // Look for OK button but DON'T click it (to avoid fullscreen)
    cy.get('body').then(($body) => {
      takeScreenshot('03-looking-for-elements');

      // Try to find the memory game without going fullscreen
      // Look for any game-related elements
      const gameSelectors = [
        '[class*="memory"]',
        '[class*="card"]',
        '[class*="game"]',
        '[id*="memory"]',
        '[id*="game"]',
        'canvas',
        'svg',
      ];

      gameSelectors.forEach((selector, index) => {
        cy.get('body').then(($body) => {
          if ($body.find(selector).length > 0) {
            takeScreenshot(`04-found-${selector.replace(/[^a-zA-Z0-9]/g, '')}-elements`);
          }
        });
      });

      // Try to bypass fullscreen by directly manipulating the page
      cy.window().then((win) => {
        // Try to find and trigger the memory game without fullscreen
        if (win.document.querySelector('button')) {
          takeScreenshot('05-buttons-available');

          // Look for non-fullscreen buttons
          cy.get('button').each(($btn) => {
            const btnText = $btn.text().toLowerCase();
            if (!btnText.includes('ok') && !btnText.includes('fullscreen')) {
              cy.wrap($btn).click({ force: true });
              takeScreenshot(`06-clicked-${btnText.replace(/[^a-zA-Z0-9]/g, '')}`);
              cy.wait(2000);
            }
          });
        }

        // Try to trigger memory game initialization directly
        cy.window()
          .its('jsPsych')
          .then((jsPsych) => {
            if (jsPsych) {
              takeScreenshot('07-jspsych-available');
              // Try to access the memory game without fullscreen
            }
          })
          .then(
            () => {
              takeScreenshot('08-after-jspsych-check');
            },
            () => {
              takeScreenshot('08-no-jspsych');
            },
          );

        // Wait and take more screenshots to see if anything loads
        cy.wait(5000);
        takeScreenshot('09-after-long-wait');

        // Try to interact with any visible elements
        cy.get('body *:visible').then(($elements) => {
          takeScreenshot(`10-visible-elements-count-${$elements.length}`);
        });

        cy.wait(3000);
        takeScreenshot('11-final-state');
      });
    });
  });
});
