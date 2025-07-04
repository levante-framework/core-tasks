describe('EGMA Math Patient Screenshot Capture', () => {
  it('patiently waits for stimulus container and captures many screenshots', () => {
    cy.visit('http://localhost:8080/?task=egma-math', {
      timeout: 60000
    });
    
    let screenshotCounter = 0;
    
    const takeScreenshot = (label) => {
      const paddedCounter = String(screenshotCounter).padStart(3, '0');
      cy.screenshot(`${paddedCounter}-${label}`);
      screenshotCounter++;
    };
    
    takeScreenshot('page-loaded');
    cy.wait(3000);
    
    // Click OK button
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').realClick();
    takeScreenshot('after-ok-click');
    
    // Wait patiently for stimulus container to appear
    cy.wait(5000);
    takeScreenshot('after-5s-wait');
    
    // Check if stimulus container exists, if not wait more
    cy.get('body').then(($body) => {
      if ($body.find('.lev-stimulus-container').length === 0) {
        cy.wait(10000);
        takeScreenshot('after-15s-total');
      }
    });
    
    // Now wait for stimulus container to appear
    cy.get('.lev-stimulus-container', { timeout: 120000 }).should('exist');
    takeScreenshot('stimulus-container-appeared');
    
    // Main screenshot capture loop
    for (let i = 0; i < 100; i++) {
      cy.wait(3000);
      takeScreenshot(`step-${i + 1}`);
      
      // Try to interact with the task
      cy.get('body').then(($body) => {
        // Look for correct answer button
        if ($body.find('[aria-label="correct"]').length > 0) {
          cy.get('[aria-label="correct"]').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-clicked-correct`);
        } else if ($body.find('.correct').length > 0) {
          cy.get('.correct').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-clicked-correct-class`);
        } else if ($body.find('.secondary').length > 0) {
          // If no correct answer, click first secondary button
          cy.get('.secondary').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-clicked-secondary`);
        } else if ($body.find('.primary').length > 0) {
          cy.get('.primary').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-clicked-primary`);
        } else if ($body.find('button').length > 0) {
          cy.get('button').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-clicked-button`);
        }
        
        // Check for math slider
        if ($body.find('.jspsych-slider').length > 0) {
          cy.get('.jspsych-slider').realClick();
          takeScreenshot(`step-${i + 1}-slider-clicked`);
          
          // Look for continue button after slider
          if ($body.find('.primary').length > 0) {
            cy.get('.primary').first().click({ force: true });
            takeScreenshot(`step-${i + 1}-slider-continue`);
          }
        }
      });
      
      // Check if task is complete
      cy.get('body').then(($body) => {
        const text = $body.text().toLowerCase();
        if (text.includes('thank you') || text.includes('complete') || text.includes('exit')) {
          takeScreenshot('task-completed');
          return false; // Break the loop
        }
      });
    }
    
    takeScreenshot('final-state');
    
    cy.then(() => {
      cy.log(`✅ EGMA Math screenshot capture completed!`);
      cy.log(`📸 Total screenshots captured: ${screenshotCounter}`);
    });
  });
}); 