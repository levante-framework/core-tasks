describe('egma-math Bypass Fullscreen Test', () => {
  let screenshotCounter = 0;
  let maxScreenshots = 50;

  // Helper function to take screenshots
  function takeScreenshot(label = '') {
    if (screenshotCounter >= maxScreenshots) return;
    screenshotCounter++;
    const filename = `egma-math_bypass_${screenshotCounter.toString().padStart(3, '0')}_${label}`;
    cy.screenshot(filename, { 
      capture: 'viewport',
      overwrite: true 
    });
  }

  // Simple interaction function
  function performInteraction() {
    if (screenshotCounter >= maxScreenshots) {
      return;
    }

    takeScreenshot('interaction_attempt');

    cy.get('body').then(($body) => {
      // Look for correct answers first
      if ($body.find('[aria-label="correct"]').length > 0) {
        cy.get('[aria-label="correct"]').first().click();
      }
      else if ($body.find('.correct').length > 0) {
        cy.get('.correct').first().click();
      }
      // Look for math slider
      else if ($body.find('.jspsych-slider').length > 0) {
        cy.get('.jspsych-slider').click();
        cy.wait(1000);
        if ($body.find('.primary').length > 0) {
          cy.get('.primary').first().click();
        }
      }
      // Look for primary buttons
      else if ($body.find('.primary').length > 0) {
        cy.get('.primary').first().click();
      }
      // Look for secondary buttons (multiple choice)
      else if ($body.find('.secondary').length > 1) {
        cy.get('.secondary').first().click();
      }
      // Look for any clickable buttons
      else if ($body.find('button:not([disabled])').length > 0) {
        cy.get('button:not([disabled])').first().click();
      }
    });

    // Wait and continue
    cy.wait(3000).then(() => {
      if (screenshotCounter < maxScreenshots) {
        performInteraction();
      }
    });
  }

  it('should capture EGMA math screenshots by bypassing fullscreen', () => {
    // Try to bypass fullscreen with URL parameters
    cy.visit('http://localhost:8080/?task=egma-math&skip=true&skipInstructions=true&heavyInstructions=false');
    
    takeScreenshot('initial_load_bypass');
    
    // Wait for any content to load
    cy.wait(5000);
    
    takeScreenshot('after_wait');
    
    // Start interaction loop
    performInteraction();
    
    takeScreenshot('final_state');
  });
}); 