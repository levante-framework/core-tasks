describe('Adult Reasoning Complete Run', () => {
  it('runs complete adult-reasoning task with screenshots', () => {
    cy.visit('http://localhost:8080/?task=adult-reasoning', { timeout: 60000 });
    
    // Mock fullscreen API
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    let counter = 0;
    
    // Initial screenshot
    cy.screenshot(`${String(counter++).padStart(2, '0')}-start`);
    cy.wait(2000);
    
    // Start task
    cy.get('body').then($body => {
      if ($body.find('button:contains("OK")').length > 0) {
        cy.get('button:contains("OK")').first().click({ force: true });
        cy.screenshot(`${String(counter++).padStart(2, '0')}-clicked-ok`);
      }
    });
    
    // Main loop - run for reasonable time taking screenshots
    for (let i = 0; i < 25; i++) {
      cy.wait(6000);
      cy.screenshot(`${String(counter++).padStart(2, '0')}-step-${i}`);
      
      // Check if completed
      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        if (text.includes('thank you') || text.includes('complete') || text.includes('exit') || text.includes('finished')) {
          cy.screenshot(`${String(counter++).padStart(2, '0')}-completion-detected`);
          return; // Done
        }
        
        // Adult-reasoning specific interactions
        if ($body.find('#jspsych-html-multi-response-btngroup button').length > 0) {
          cy.get('#jspsych-html-multi-response-btngroup button').then($buttons => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons[randomIndex]).click({ force: true });
            cy.wait(1000);
          });
        } else if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if ($body.find('button:contains("Next")').length > 0) {
          cy.get('button:contains("Next")').first().click({ force: true });
        } else if ($body.find('button').length > 0) {
          // Click any available button
          cy.get('button').then($buttons => {
            const visibleButtons = $buttons.filter(':visible');
            if (visibleButtons.length > 0) {
              cy.wrap(visibleButtons[0]).click({ force: true });
            }
          });
        }
      });
    }
    
    cy.screenshot(`${String(counter++).padStart(2, '0')}-final`);
  });
}); 