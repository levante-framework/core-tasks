const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Bypass Fullscreen', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
    cy.wait(1000);
  }

  it('bypasses fullscreen permission and captures memory game', () => {
    // Visit the page and immediately mock fullscreen API
    cy.visit(memory_game_url, {
      onBeforeLoad: (win) => {
        // Mock the fullscreen API to always succeed
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        
        // Mock fullscreen properties
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });

        // Mock permissions API to always allow fullscreen
        if (win.navigator.permissions) {
          win.navigator.permissions.query = cy.stub().resolves({ state: 'granted' });
        }
      }
    });

    takeScreenshot('01-initial-load-with-mocked-fullscreen');

    // Wait for page to load
    cy.wait(3000);
    takeScreenshot('02-page-loaded');

    // Now click OK button since fullscreen should be mocked
    cy.contains('OK', { timeout: 10000 }).should('be.visible');
    takeScreenshot('03-ok-button-visible');

    cy.contains('OK').click({ force: true });
    takeScreenshot('04-after-ok-click');

    // Wait for memory game to initialize
    cy.wait(5000);
    takeScreenshot('05-after-fullscreen-attempt');

    // Take screenshots at intervals to capture game progression
    for (let i = 0; i < 10; i++) {
      cy.wait(3000);
      takeScreenshot(`06-game-state-${i + 1}`);
      
      // Try to interact with any visible game elements
      cy.get('body').then(($body) => {
        const clickableElements = $body.find('button:visible, [onclick]:visible, canvas:visible');
        if (clickableElements.length > 0) {
          cy.wrap(clickableElements.first()).click({ force: true });
          takeScreenshot(`07-interaction-${i + 1}`);
        }
      });
    }

    takeScreenshot('08-final-state');
  });
}); 