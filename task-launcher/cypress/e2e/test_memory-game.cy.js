describe('memory-game Complete Run', () => {
  it('runs complete task with screenshots', () => {
    cy.visit('http://localhost:8080/?task=memory-game', { timeout: 60000 });
    
    // Mock fullscreen
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
    for (let i = 0; i < 20; i++) {
      cy.wait(8000);
      cy.screenshot(`${String(counter++).padStart(2, '0')}-step-${i}`);
      
      // Check if completed
      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        if (text.includes('thank you') || text.includes('complete') || text.includes('exit')) {
          return; // Done
        }
        
        // Continue interacting
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if ($body.find('.jspsych-corsi-block').length > 0) {
          cy.get('.jspsych-corsi-block').then($blocks => {
            cy.wrap($blocks[Math.floor(Math.random() * $blocks.length)]).click({ force: true });
          });
        } else if ($body.find('#jspsych-html-multi-response-btngroup button').length > 0) {
          cy.get('#jspsych-html-multi-response-btngroup button').then($buttons => {
            cy.wrap($buttons[Math.floor(Math.random() * $buttons.length)]).click({ force: true });
          });
        } else if ($body.find('button').length > 0) {
          cy.get('button').first().click({ force: true });
        }
      });
    }
    
    cy.screenshot(`${String(counter++).padStart(2, '0')}-final`);
  });
});
