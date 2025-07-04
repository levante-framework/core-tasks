describe('EGMA Math No Fullscreen Screenshot Capture', () => {
  it('bypasses fullscreen and captures screenshots', () => {
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
        
        // Mock fullscreen change events
        win.document.addEventListener = cy.stub();
        win.document.removeEventListener = cy.stub();
      }
    });
    
    let screenshotCounter = 0;
    
    const takeScreenshot = (label) => {
      const paddedCounter = String(screenshotCounter).padStart(3, '0');
      cy.screenshot(`${paddedCounter}-${label}`);
      screenshotCounter++;
    };
    
    takeScreenshot('page-loaded');
    cy.wait(3000);
    
    // Click OK button with regular click
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').click({ force: true });
    takeScreenshot('after-ok-click');
    
    // Wait and take more screenshots
    cy.wait(5000);
    takeScreenshot('after-5s-wait');
    
    // Look for any content that appears
    cy.get('body').then(($body) => {
      const allElements = $body.find('*');
      cy.log(`Found ${allElements.length} total elements`);
      
      // Look for common jsPsych elements
      const jspsychContent = $body.find('.jspsych-content');
      const jspsychDisplay = $body.find('.jspsych-display-element');
      
      if (jspsychContent.length > 0) {
        cy.log('Found jspsych-content');
        takeScreenshot('jspsych-content-found');
      }
      
      if (jspsychDisplay.length > 0) {
        cy.log('Found jspsych-display-element');
        takeScreenshot('jspsych-display-found');
      }
    });
    
    // Try to progress through the task without waiting for stimulus container
    for (let i = 0; i < 50; i++) {
      cy.wait(4000);
      takeScreenshot(`step-${i + 1}`);
      
      // Try various interaction strategies
      cy.get('body').then(($body) => {
        let interacted = false;
        
        // Strategy 1: Look for correct answer
        if ($body.find('[aria-label="correct"]').length > 0) {
          cy.get('[aria-label="correct"]').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-correct-answer`);
          interacted = true;
        }
        // Strategy 2: Look for correct class
        else if ($body.find('.correct').length > 0) {
          cy.get('.correct').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-correct-class`);
          interacted = true;
        }
        // Strategy 3: Look for secondary buttons
        else if ($body.find('.secondary').length > 0) {
          cy.get('.secondary').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-secondary-button`);
          interacted = true;
        }
        // Strategy 4: Look for primary buttons
        else if ($body.find('.primary').length > 0) {
          cy.get('.primary').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-primary-button`);
          interacted = true;
        }
        // Strategy 5: Look for any button
        else if ($body.find('button').length > 0) {
          cy.get('button').first().click({ force: true });
          takeScreenshot(`step-${i + 1}-any-button`);
          interacted = true;
        }
        
        // Handle math slider
        if ($body.find('.jspsych-slider').length > 0) {
          cy.get('.jspsych-slider').click({ force: true });
          takeScreenshot(`step-${i + 1}-slider`);
          
          // Look for continue after slider
          if ($body.find('.primary').length > 0) {
            cy.get('.primary').first().click({ force: true });
            takeScreenshot(`step-${i + 1}-slider-continue`);
          }
        }
        
        if (!interacted) {
          cy.log(`Step ${i + 1}: No interaction elements found`);
        }
      });
      
      // Check for completion
      cy.get('body').then(($body) => {
        const text = $body.text().toLowerCase();
        if (text.includes('thank you') || text.includes('complete') || text.includes('exit')) {
          takeScreenshot('task-completed');
          return false;
        }
      });
    }
    
    takeScreenshot('final-state');
    
    cy.then(() => {
      cy.log(`✅ EGMA Math no-fullscreen capture completed!`);
      cy.log(`📸 Total screenshots captured: ${screenshotCounter}`);
    });
  });
}); 