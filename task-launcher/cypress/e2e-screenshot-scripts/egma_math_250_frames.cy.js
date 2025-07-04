describe('EGMA Math 250+ Screenshots Capture', () => {
  it('captures 250+ screenshots with optimized timing and interactions', () => {
    cy.visit('http://localhost:8080/?task=egma-math', {
      timeout: 60000,
      onBeforeLoad(win) {
        // Mock fullscreen API completely
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
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
    
    let screenshotCounter = 0;
    
    const takeScreenshot = (label) => {
      const paddedCounter = String(screenshotCounter).padStart(3, '0');
      cy.screenshot(`${paddedCounter}-${label}`);
      screenshotCounter++;
    };
    
    takeScreenshot('page-loaded');
    cy.wait(2000);
    
    // Click OK button to start
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').click({ force: true });
    takeScreenshot('after-ok-click');
    cy.wait(3000);
    
    // Main capture loop - 250 screenshots with 2-second intervals
    for (let i = 0; i < 250; i++) {
      takeScreenshot(`frame-${i + 1}`);
      
      // Every few frames, try to interact with the task
      if (i % 3 === 0) {
        cy.get('body').then(($body) => {
          let interacted = false;
          
          // Priority 1: Look for correct answer (most important for progression)
          if ($body.find('[aria-label="correct"]').length > 0) {
            cy.get('[aria-label="correct"]').first().click({ force: true });
            interacted = true;
          }
          // Priority 2: Look for correct class
          else if ($body.find('.correct').length > 0) {
            cy.get('.correct').first().click({ force: true });
            interacted = true;
          }
          // Priority 3: Handle math slider
          else if ($body.find('.jspsych-slider').length > 0) {
            cy.get('.jspsych-slider').click({ force: true });
            // Look for continue button after slider
            cy.get('body').then(($body2) => {
              if ($body2.find('.primary').length > 0) {
                cy.get('.primary').first().click({ force: true });
              }
            });
            interacted = true;
          }
          // Priority 4: Look for secondary buttons (answer choices)
          else if ($body.find('.secondary').length > 1) {
            // If multiple secondary buttons, click the first one (might be correct)
            cy.get('.secondary').first().click({ force: true });
            interacted = true;
          }
          // Priority 5: Look for primary buttons (continue/ok)
          else if ($body.find('.primary').length > 0) {
            cy.get('.primary').first().click({ force: true });
            interacted = true;
          }
          // Priority 6: Any button as last resort
          else if ($body.find('button:visible').length > 0) {
            cy.get('button:visible').first().click({ force: true });
            interacted = true;
          }
          
          // Log interaction for debugging
          if (interacted && i % 10 === 0) {
            cy.log(`Frame ${i + 1}: Interaction performed`);
          }
        });
      }
      
      // Fast wait between screenshots (2 seconds)
      cy.wait(2000);
      
      // Every 25 frames, check for completion
      if (i % 25 === 0) {
        cy.get('body').then(($body) => {
          const text = $body.text().toLowerCase();
          if (text.includes('thank you') || text.includes('complete') || text.includes('exit')) {
            takeScreenshot('task-completed');
            cy.log(`✅ Task completed at frame ${i + 1}`);
            return false; // This would break in a real loop, but Cypress handles it differently
          }
        });
      }
    }
    
    // Final screenshots
    takeScreenshot('final-state');
    takeScreenshot('capture-complete');
    
    cy.then(() => {
      cy.log(`🎉 EGMA Math 250+ frame capture completed!`);
      cy.log(`📸 Total screenshots captured: ${screenshotCounter}`);
      cy.log(`⏱️ Estimated total time: ${(screenshotCounter * 2) / 60} minutes`);
    });
  });
}); 