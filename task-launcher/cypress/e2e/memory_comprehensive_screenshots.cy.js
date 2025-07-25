const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Comprehensive Screenshots', () => {
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
    // Small wait between screenshots to capture state changes
    cy.wait(500);
  }

  it('captures comprehensive screenshots of the memory game', () => {
    cy.visit(memory_game_url);
    takeScreenshot('01-initial-load');

    // Wait for page to fully load
    cy.wait(3000);
    takeScreenshot('02-after-page-load');

    // Look for and interact with common UI elements
    cy.get('body').then(($body) => {
      // Take screenshot of whatever is currently visible
      takeScreenshot('03-body-loaded');

      // Look for buttons and take screenshots
      if ($body.find('button').length > 0) {
        takeScreenshot('04-buttons-found');

        // Try to click any visible buttons
        cy.get('button:visible')
          .first()
          .then(($btn) => {
            takeScreenshot('05-before-button-click');
            cy.wrap($btn).click({ force: true });
            takeScreenshot('06-after-button-click');
          });
      }

      // Wait and take more screenshots to capture any animations or state changes
      cy.wait(2000);
      takeScreenshot('07-after-wait-2s');

      cy.wait(3000);
      takeScreenshot('08-after-wait-5s');

      // Look for any game elements that might have appeared
      if ($body.find('.memory-card, .card, .game-board, [class*="memory"], [class*="card"]').length > 0) {
        takeScreenshot('09-game-elements-found');
      }

      // Try to interact with any clickable elements
      cy.get('body')
        .find('*')
        .each(($el) => {
          if ($el.is(':visible') && ($el.is('button') || $el.is('[onclick]') || $el.css('cursor') === 'pointer')) {
            cy.wrap($el).click({ force: true });
            takeScreenshot(`10-clicked-element-${$el.prop('tagName')}`);
            cy.wait(1000);
          }
        });

      // Take final screenshots
      cy.wait(5000);
      takeScreenshot('11-final-state');
    });
  });
});
