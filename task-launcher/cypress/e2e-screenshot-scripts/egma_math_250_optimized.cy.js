describe('EGMA Math 250+ Optimized Screenshots', () => {
  it('captures 250+ screenshots with optimized memory management', () => {
    cy.visit('http://localhost:8080/?task=egma-math', {
      timeout: 60000,
      onBeforeLoad(win) {
        // Mock fullscreen API
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
    cy.wait(1000);
    
    // Click OK button to start
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').click({ force: true });
    takeScreenshot('after-ok-click');
    cy.wait(2000);
    
    // Main capture loop - 250 screenshots with 1.5-second intervals
    for (let i = 0; i < 250; i++) {
      takeScreenshot(`frame-${i + 1}`);
      
      // More frequent interactions to keep task progressing
      if (i % 2 === 0) {
        cy.get('body').then(($body) => {
          // Priority interaction sequence
          if ($body.find('[aria-label="correct"]').length > 0) {
            cy.get('[aria-label="correct"]').first().click({ force: true });
          } else if ($body.find('.correct').length > 0) {
            cy.get('.correct').first().click({ force: true });
          } else if ($body.find('.jspsych-slider').length > 0) {
            cy.get('.jspsych-slider').click({ force: true });
            cy.get('body').then(($body2) => {
              if ($body2.find('.primary').length > 0) {
                cy.get('.primary').first().click({ force: true });
              }
            });
          } else if ($body.find('.secondary').length > 1) {
            // Click first secondary button (likely an answer choice)
            cy.get('.secondary').first().click({ force: true });
          } else if ($body.find('.primary').length > 0) {
            cy.get('.primary').first().click({ force: true });
          } else if ($body.find('button:visible').length > 0) {
            cy.get('button:visible').first().click({ force: true });
          }
        });
      }
      
      // Shorter wait to capture more frames and reduce memory buildup
      cy.wait(1500);
      
      // Check for task completion every 20 frames
      if (i % 20 === 0 && i > 0) {
        cy.get('body').then(($body) => {
          const text = $body.text().toLowerCase();
          if (text.includes('thank you') || text.includes('complete') || text.includes('exit')) {
            takeScreenshot('task-completed');
            cy.log(`✅ Task completed at frame ${i + 1}`);
            // Continue capturing a few more frames after completion
            if (i > 200) {
              return false;
            }
          }
        });
      }
      
      // Memory management: log progress every 25 frames
      if (i % 25 === 0 && i > 0) {
        cy.log(`📸 Progress: ${i} frames captured`);
      }
    }
    
    // Final screenshots
    takeScreenshot('final-state');
    takeScreenshot('capture-complete');
    
    cy.then(() => {
      cy.log(`🎉 EGMA Math optimized capture completed!`);
      cy.log(`📸 Total screenshots captured: ${screenshotCounter}`);
      cy.log(`⏱️ Total time: ${(screenshotCounter * 1.5) / 60} minutes`);
    });
  });
}); 