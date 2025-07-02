describe('theory-of-mind Complete Task Capture', () => {
  it('should capture screenshots throughout entire task', () => {
    let screenshotCounter = 0;
    
    // Visit the task
    cy.visit('http://localhost:8080?task=theory-of-mind');
    
    // Mock fullscreen API to prevent errors
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    // Take initial screenshot
    cy.screenshot('00-start');
    
    // Capture 48 screenshots over 240 seconds (every 5 seconds)
    for (let i = 1; i <= 48; i++) {
      // Wait 5 seconds
      cy.wait(5 * 1000);
      
      // Try interactions before taking screenshot
      cy.get('body').then(($body) => {
        // Strategy 1: Continue/OK/Next buttons
        if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').first().click();
        }
        // Strategy 2: Task-specific elements
        else if ($body.find('[data-choice], .choice-button, .response-button').length > 0) {
          cy.get('[data-choice], .choice-button, .response-button').first().click();
        }
        // Strategy 3: Any enabled buttons
        else if ($body.find('button:not([disabled])').length > 0) {
          cy.get('button:not([disabled])').first().click();
        }
        // Strategy 4: Random button selection for multiple choice tasks
        else if ($body.find('button').length >= 2) {
          // Randomly click one of the available buttons
          const buttonIndex = Math.floor(Math.random() * $body.find('button').length);
          cy.get('button').eq(buttonIndex).click();
        }
      });
      
      // Take screenshot
      cy.screenshot(`${i.toString().padStart(2, '0')}-step-${i}`);
    }
    
    // Final screenshot
    cy.screenshot('99-final');
  });
});
