describe('Adult Reasoning Improved Screenshot Capture', () => {
  it('captures screenshots from adult-reasoning with proper interactions', () => {
    cy.visit('http://localhost:8080/?task=adult-reasoning');
    
    // Mock fullscreen API
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    // Initial screenshot
    cy.screenshot('01-initial-load');
    
    // Function to handle interactions and take screenshots
    const captureWithInteraction = (screenshotName) => {
      cy.wait(8000); // Wait 8 seconds between screenshots
      
      // Try to interact with the task
      cy.get('body').then(($body) => {
        // Check for fullscreen/start buttons first
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } 
        // Check for Continue buttons
        else if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        }
        // Check for multi-response buttons (main task responses)
        else if ($body.find('#jspsych-html-multi-response-btngroup button').length > 0) {
          // Click a random response button
          cy.get('#jspsych-html-multi-response-btngroup button').then($buttons => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons[randomIndex]).click({ force: true });
          });
        }
        // Check for any other buttons
        else if ($body.find('button').length > 0) {
          cy.get('button').first().click({ force: true });
        }
        // Try clicking on clickable elements
        else if ($body.find('[onclick], .clickable, .jspsych-btn').length > 0) {
          cy.get('[onclick], .clickable, .jspsych-btn').first().click({ force: true });
        }
      });
      
      // Take screenshot after interaction
      cy.screenshot(screenshotName);
    };
    
    // Capture 15 screenshots with interactions
    captureWithInteraction('02-after-8s');
    captureWithInteraction('03-after-16s');
    captureWithInteraction('04-after-24s');
    captureWithInteraction('05-after-32s');
    captureWithInteraction('06-after-40s');
    captureWithInteraction('07-after-48s');
    captureWithInteraction('08-after-56s');
    captureWithInteraction('09-after-64s');
    captureWithInteraction('10-after-72s');
    captureWithInteraction('11-after-80s');
    captureWithInteraction('12-after-88s');
    captureWithInteraction('13-after-96s');
    captureWithInteraction('14-after-104s');
    captureWithInteraction('15-final');
    
    // Final wait and screenshot
    cy.wait(5000);
    cy.screenshot('16-very-final');
  });
}); 