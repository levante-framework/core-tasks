describe('Single Task Test - Memory Game', () => {
  it('should capture screenshots with interactions', () => {
    // Mock fullscreen API to prevent errors
    cy.visit('http://localhost:8080/?task=memory-game', {
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
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

    // Take initial screenshot
    cy.screenshot('00-start');
    
    // Wait for initial load
    cy.wait(3000);
    
    // Take screenshots at intervals with interactions
    for (let i = 0; i < 10; i++) {
      // Try to interact with common elements
      cy.get('body').then(($body) => {
        const selectors = [
          'button:contains("OK")',
          'button:contains("Continue")',
          'button:contains("Next")',
          'button:contains("Start")',
          '.jspsych-btn',
          'button[type="button"]',
          '.btn',
          'button'
        ];
        
        let clicked = false;
        for (const selector of selectors) {
          if ($body.find(selector).length > 0) {
            cy.get(selector).first().then(($el) => {
              if ($el.is(':visible') && !clicked) {
                cy.wrap($el).click({ force: true });
                clicked = true;
              }
            });
            break;
          }
        }
        
        // If no buttons found, click randomly
        if (!clicked) {
          cy.get('body').click(500, 300, { force: true });
        }
      });
      
      // Wait and take screenshot
      cy.wait(5000);
      cy.screenshot(`${String(i + 1).padStart(2, '0')}-step-${i}`);
    }
    
    // Final screenshot
    cy.screenshot('99-final');
  });
}); 