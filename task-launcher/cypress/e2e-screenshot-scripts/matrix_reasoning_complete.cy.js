const matrix_reasoning_url = 'http://localhost:8080/?task=matrix-reasoning';

describe('Matrix Reasoning Complete Run', () => {
  it('runs complete matrix-reasoning task with screenshots', () => {
    cy.visit('http://localhost:8080/?task=matrix-reasoning', { timeout: 60000 });
    
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
    for (let i = 0; i < 20; i++) {
      cy.wait(8000);
      cy.screenshot(`${String(counter++).padStart(2, '0')}-step-${i}`);
      
      // Check if completed
      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        if (text.includes('thank you') || text.includes('complete') || text.includes('exit') || text.includes('finished')) {
          cy.screenshot(`${String(counter++).padStart(2, '0')}-completion-detected`);
          return; // Done
        }
        
        // Matrix reasoning interactions - click on answer options
        if ($body.find('button').length > 0) {
          cy.get('button').then($buttons => {
            const visibleButtons = $buttons.filter(':visible');
            if (visibleButtons.length > 0) {
              // Try to find answer buttons first
              const answerButtons = visibleButtons.filter(':contains("A"), :contains("B"), :contains("C"), :contains("D")');
              if (answerButtons.length > 0) {
                const randomIndex = Math.floor(Math.random() * answerButtons.length);
                cy.wrap(answerButtons[randomIndex]).click({ force: true });
              } else {
                // Click any visible button
                const randomIndex = Math.floor(Math.random() * visibleButtons.length);
                cy.wrap(visibleButtons[randomIndex]).click({ force: true });
              }
            }
          });
        }
      });
    }
    
    cy.screenshot(`${String(counter++).padStart(2, '0')}-final`);
  });
});
