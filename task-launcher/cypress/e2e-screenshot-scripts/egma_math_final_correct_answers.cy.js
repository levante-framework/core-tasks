describe('EGMA Math Final Screenshot Capture - Correct Answers', () => {
  it('captures 150+ screenshots by clicking correct answers throughout EGMA math task', () => {
    cy.visit('http://localhost:8080/?task=egma-math', {
      timeout: 60000
    });
    
    // Mock fullscreen API - let browser handle naturally
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    // Initial screenshot
    cy.screenshot('000-initial-load');
    cy.wait(2000);
    
    // Handle initial OK/Start button
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("OK")').length > 0) {
        cy.get('button:contains("OK")').first().click({ force: true });
        cy.screenshot('001-after-ok');
      } else if ($body.find('button:contains("Start")').length > 0) {
        cy.get('button:contains("Start")').first().click({ force: true });
        cy.screenshot('001-after-start');
      }
    });
    
    cy.wait(3000);
    cy.screenshot('002-task-started');
    
    // Main task progression loop - click correct answers
    let screenshotCounter = 3;
    const maxScreenshots = 200; // Capture up to 200 screenshots
    
    // Function to handle fullscreen transition
    const handleFullscreenTransition = () => {
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().realClick();
          cy.wait(2000);
        }
      });
    };
    
    // Main progression loop
    for (let i = 0; i < maxScreenshots; i++) {
      cy.then(() => {
        // Take screenshot
        const paddedCounter = String(screenshotCounter).padStart(3, '0');
        cy.screenshot(`${paddedCounter}-step-${i + 1}`);
        screenshotCounter++;
        
        // Wait for stimulus container to be present
        cy.get('body').then(($body) => {
          if ($body.find('.lev-stimulus-container').length > 0) {
            // Wait for stimulus to load
            cy.get('.lev-stimulus-container', { timeout: 10000 }).should('exist');
            cy.wait(1000);
            
            // Always click the correct answer
            cy.get('body').then(($body) => {
              if ($body.find('[aria-label="correct"]').length > 0) {
                cy.get('[aria-label="correct"]').first().click({ force: true });
                cy.wait(1000);
              } else if ($body.find('button:contains("Continue")').length > 0) {
                cy.get('button:contains("Continue")').first().realClick();
                cy.wait(2000);
              } else if ($body.find('button:contains("OK")').length > 0) {
                cy.get('button:contains("OK")').first().click({ force: true });
                cy.wait(1000);
              } else {
                // If no specific correct answer, try general interaction
                cy.get('body').then(($body) => {
                  const buttons = $body.find('button:visible');
                  if (buttons.length > 0) {
                    cy.wrap(buttons.first()).click({ force: true });
                    cy.wait(1000);
                  }
                });
              }
            });
            
            // Wait for stimulus to disappear (indicating progression)
            cy.get('.lev-stimulus-container', { timeout: 15000 }).should('not.exist');
            cy.wait(2000);
          } else {
            // No stimulus container, check for other interaction elements
            cy.get('body').then(($body) => {
              if ($body.find('button:contains("Continue")').length > 0) {
                cy.get('button:contains("Continue")').first().realClick();
                cy.wait(2000);
              } else if ($body.find('button:contains("OK")').length > 0) {
                cy.get('button:contains("OK")').first().click({ force: true });
                cy.wait(1000);
              } else if ($body.find('[aria-label="correct"]').length > 0) {
                cy.get('[aria-label="correct"]').first().click({ force: true });
                cy.wait(1000);
              } else {
                // Wait and check again
                cy.wait(3000);
              }
            });
          }
        });
      });
    }
    
    // Final screenshot
    cy.screenshot('999-final-state');
    
    cy.log('✅ EGMA Math screenshot capture completed!');
    cy.log(`📸 Captured approximately ${screenshotCounter} screenshots`);
  });
}); 