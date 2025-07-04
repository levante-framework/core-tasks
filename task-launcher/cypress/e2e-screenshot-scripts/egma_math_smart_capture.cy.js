describe('EGMA Math Smart Content-Aware Capture', () => {
  it('captures screenshots only when content changes and keeps task progressing', () => {
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
    let lastContentHash = '';
    
    const takeScreenshot = (label) => {
      const paddedCounter = String(screenshotCounter).padStart(3, '0');
      cy.screenshot(`${paddedCounter}-${label}`);
      screenshotCounter++;
    };
    
    const getContentHash = ($body) => {
      // Create a simple hash of visible content
      const visibleText = $body.find(':visible').text().trim();
      const visibleElements = $body.find(':visible').length;
      const buttons = $body.find('button:visible').length;
      return `${visibleText.length}-${visibleElements}-${buttons}`;
    };
    
    takeScreenshot('page-loaded');
    cy.wait(1000);
    
    // Click OK button to start
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').click({ force: true });
    takeScreenshot('after-ok-click');
    cy.wait(3000);
    
    // Main smart capture loop
    for (let i = 0; i < 300; i++) {
      cy.get('body').then(($body) => {
        const currentHash = getContentHash($body);
        
        // Only take screenshot if content changed
        if (currentHash !== lastContentHash) {
          takeScreenshot(`content-change-${i + 1}`);
          lastContentHash = currentHash;
          cy.log(`📸 Content changed at iteration ${i + 1}`);
        }
        
        // Aggressive interaction every iteration
        let interacted = false;
        
        // Strategy 1: Always click correct answers immediately
        if ($body.find('[aria-label="correct"]').length > 0) {
          cy.get('[aria-label="correct"]').first().click({ force: true });
          interacted = true;
        }
        // Strategy 2: Click correct class
        else if ($body.find('.correct').length > 0) {
          cy.get('.correct').first().click({ force: true });
          interacted = true;
        }
        // Strategy 3: Handle math slider immediately
        else if ($body.find('.jspsych-slider').length > 0) {
          cy.get('.jspsych-slider').click({ force: true });
          cy.wait(500);
          if ($body.find('.primary').length > 0) {
            cy.get('.primary').first().click({ force: true });
          }
          interacted = true;
        }
        // Strategy 4: Click any secondary button (answer choices)
        else if ($body.find('.secondary').length > 0) {
          cy.get('.secondary').first().click({ force: true });
          interacted = true;
        }
        // Strategy 5: Click primary buttons (continue/ok)
        else if ($body.find('.primary').length > 0) {
          cy.get('.primary').first().click({ force: true });
          interacted = true;
        }
        // Strategy 6: Click any visible button
        else if ($body.find('button:visible').length > 0) {
          cy.get('button:visible').first().click({ force: true });
          interacted = true;
        }
        
        if (interacted) {
          cy.wait(1000); // Wait for interaction to take effect
        }
      });
      
      // Short wait between iterations
      cy.wait(1000);
      
      // Check for completion every 20 iterations
      if (i % 20 === 0 && i > 0) {
        cy.get('body').then(($body) => {
          const text = $body.text().toLowerCase();
          if (text.includes('thank you') || text.includes('complete') || text.includes('exit')) {
            takeScreenshot('task-completed');
            cy.log(`✅ Task completed at iteration ${i + 1}`);
            // Continue for a few more iterations to capture completion screens
            if (i > 250) {
              return false;
            }
          }
        });
      }
      
      // Progress logging
      if (i % 50 === 0 && i > 0) {
        cy.log(`🔄 Progress: ${i} iterations, ${screenshotCounter} screenshots`);
      }
    }
    
    // Final screenshots
    takeScreenshot('final-state');
    takeScreenshot('capture-complete');
    
    cy.then(() => {
      cy.log(`🎉 EGMA Math smart capture completed!`);
      cy.log(`📸 Total unique screenshots captured: ${screenshotCounter}`);
      cy.log(`⏱️ Total iterations: 300`);
    });
  });
}); 