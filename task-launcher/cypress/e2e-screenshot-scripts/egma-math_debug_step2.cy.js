describe('egma-math Debug Step 2 Test', () => {
  let screenshotCounter = 0;
  let maxScreenshots = 20; // Limit for debugging

  // Helper function to take screenshots
  function takeScreenshot(label = '') {
    screenshotCounter++;
    const filename = `egma-math_debug_${screenshotCounter.toString().padStart(3, '0')}_${label}`;
    cy.screenshot(filename, { 
      capture: 'viewport',
      overwrite: true 
    });
    cy.log(`Screenshot ${screenshotCounter}: ${label}`);
  }

  // Log current page state
  function logPageState() {
    cy.get('body').then(($body) => {
      const hasSlider = $body.find('.jspsych-slider').length > 0;
      const hasSecondaryButtons = $body.find('.secondary').length;
      const hasPrimaryButtons = $body.find('.primary').length;
      const hasCorrectButtons = $body.find('[aria-label="correct"]').length;
      const hasCorrectClass = $body.find('.correct').length;
      const hasInstructions = $body.find('.jspsych-instructions').length > 0;
      
      cy.log(`Page state: slider=${hasSlider}, secondary=${hasSecondaryButtons}, primary=${hasPrimaryButtons}, correct-aria=${hasCorrectButtons}, correct-class=${hasCorrectClass}, instructions=${hasInstructions}`);
      
      // Log any visible text
      if ($body.find('.jspsych-content').length > 0) {
        const content = $body.find('.jspsych-content').text().substring(0, 100);
        cy.log(`Content preview: ${content}`);
      }
    });
  }

  // Simple interaction function
  function performInteraction() {
    if (screenshotCounter >= maxScreenshots) {
      cy.log('Max screenshots reached, stopping');
      return;
    }

    takeScreenshot('before_interaction');
    logPageState();

    cy.get('body').then(($body) => {
      // Check for slider first
      if ($body.find('.jspsych-slider').length > 0 && $body.find('.secondary').length === 0) {
        cy.log('Found slider, clicking it');
        cy.get('.jspsych-slider').click();
        cy.wait(1000);
        
        // Look for continue button
        if ($body.find('.primary').length > 0) {
          cy.log('Found primary button after slider, clicking it');
          cy.get('.primary').click();
        }
      }
      // Check for correct answer buttons
      else if ($body.find('[aria-label="correct"]').length > 0) {
        cy.log('Found aria-label="correct" button, clicking it');
        cy.get('[aria-label="correct"]').first().click();
      }
      else if ($body.find('.correct').length > 0) {
        cy.log('Found .correct button, clicking it');
        cy.get('.correct').first().click();
      }
      // Check for multiple choice buttons
      else if ($body.find('.secondary').length > 1) {
        cy.log(`Found ${$body.find('.secondary').length} secondary buttons, clicking first one`);
        cy.get('.secondary').first().click();
      }
      // Check for primary/continue buttons
      else if ($body.find('.primary').length > 0) {
        cy.log('Found primary button, clicking it');
        cy.get('.primary').first().click();
      }
      // Check for exit button
      else if ($body.find('footer').length > 0) {
        cy.log('Found footer, looking for exit');
        cy.contains('Exit').click();
        return;
      }
      else {
        cy.log('No interactive elements found, waiting');
      }
    });

    // Wait and continue
    cy.wait(2000).then(() => {
      if (screenshotCounter < maxScreenshots) {
        performInteraction();
      }
    });
  }

  it('should debug EGMA math task progression at step 2', () => {
    // Mock fullscreen API
    cy.visit('http://localhost:8080/?task=egma-math', {
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          value: win.document.documentElement,
          writable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          value: true,
          writable: true
        });
      }
    });

    // Wait for initial load
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    takeScreenshot('initial_load');
    
    // Start the task
    cy.log('Starting task by clicking OK');
    cy.contains('OK').click();
    
    // Wait a moment for task to start
    cy.wait(3000);
    
    // Begin interaction loop
    performInteraction();
  });
}); 