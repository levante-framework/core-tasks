describe('Quick Memory Game Test', () => {
  it('captures screenshots from memory game', () => {
    // Visit with fullscreen mocking
    cy.visit('http://localhost:8080/?task=memory-game', {
      timeout: 30000,
      onBeforeLoad: (win) => {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
      }
    });

    // Take initial screenshot
    cy.screenshot('01-initial-load');
    cy.wait(5000);

    // Take screenshots every 10 seconds for 1 minute
    for (let i = 1; i <= 6; i++) {
      cy.wait(10000);
      cy.screenshot(`${(i+1).toString().padStart(2, '0')}-interval-${i}`);
      
      // Try to click any buttons that appear
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if ($body.find('button:contains("Start")').length > 0) {
          cy.get('button:contains("Start")').first().click({ force: true });
        } else if ($body.find('button:visible').length > 0) {
          cy.get('button:visible').first().click({ force: true });
        }
      });
    }

    // Final screenshot
    cy.screenshot('08-final');
  });
});
