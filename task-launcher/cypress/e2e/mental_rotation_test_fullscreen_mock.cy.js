describe('Mental Rotation Test with Fullscreen Mock and Screenshots', () => {
  let screenshotCounter = 0;

  function takeScreenshot(name) {
    if (Cypress.env('takeScreenshots')) {
      screenshotCounter++;
      const paddedCounter = screenshotCounter.toString().padStart(4, '0');
      cy.screenshot(`${paddedCounter}_mental_rotation_${name}`, { 
        capture: 'viewport',
        overwrite: true 
      });
    }
  }

  beforeEach(() => {
    // Mock fullscreen API
    cy.window().then((win) => {
      // Mock fullscreen methods
      win.document.requestFullscreen = cy.stub().resolves();
      win.document.exitFullscreen = cy.stub().resolves();
      win.document.webkitRequestFullscreen = cy.stub().resolves();
      win.document.mozRequestFullScreen = cy.stub().resolves();
      win.document.msRequestFullscreen = cy.stub().resolves();
      
      // Mock fullscreen properties
      Object.defineProperty(win.document, 'fullscreenElement', {
        value: win.document.documentElement,
        writable: true
      });
      Object.defineProperty(win.document, 'webkitFullscreenElement', {
        value: win.document.documentElement,
        writable: true
      });
      Object.defineProperty(win.document, 'mozFullScreenElement', {
        value: win.document.documentElement,
        writable: true
      });
      
      // Mock element fullscreen methods
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      win.document.documentElement.webkitRequestFullscreen = cy.stub().resolves();
      win.document.documentElement.mozRequestFullScreen = cy.stub().resolves();
      
      // Dispatch fullscreen change event
      const fullscreenEvent = new Event('fullscreenchange');
      win.document.dispatchEvent(fullscreenEvent);
    });
  });

  it('Mental Rotation test with fullscreen mocking and comprehensive screenshots', () => {
    const mentalRotationUrl = 'http://localhost:8080/?task=mental-rotation';
    
    cy.visit(mentalRotationUrl);
    takeScreenshot('initial_visit');
    
    // Wait for page to load
    cy.wait(3000);
    takeScreenshot('page_loaded');
    
    // Mock fullscreen API after page load
    cy.window().then((win) => {
      win.document.fullscreenElement = win.document.documentElement;
      takeScreenshot('fullscreen_api_mocked');
    });
    
    // Start monitoring and automatic interaction
    let monitoringActive = true;
    let interactionCount = 0;
    
    function performAutomaticInteractions() {
      if (!monitoringActive || interactionCount > 200) return;
      
      interactionCount++;
      
      // Take periodic screenshots
      if (interactionCount % 5 === 0) {
        takeScreenshot(`monitoring_${interactionCount}`);
      }
      
      cy.get('body').then(($body) => {
        // Look for various interactive elements
        const selectors = [
          'button:visible',
          '.primary:visible',
          '.secondary:visible', 
          '[role="button"]:visible',
          '.jspsych-btn:visible',
          '.image:visible',
          'img:visible',
          'input[type="button"]:visible',
          '.continue-btn:visible',
          '.next-btn:visible',
          '.ok-btn:visible'
        ];
        
        let foundElement = false;
        
        for (const selector of selectors) {
          const elements = $body.find(selector);
          if (elements.length > 0) {
            const element = elements.first();
            if (element.is(':visible')) {
              takeScreenshot(`clicking_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${interactionCount}`);
              element.click();
              foundElement = true;
              break;
            }
          }
        }
        
        // Look for text that might indicate completion
        const completionTexts = ['Thank you', 'Complete', 'Finished', 'Done', 'Exit'];
        for (const text of completionTexts) {
          if ($body.text().includes(text)) {
            takeScreenshot(`completion_detected_${text}_${interactionCount}`);
            monitoringActive = false;
            return;
          }
        }
        
        // Continue monitoring
        if (monitoringActive && interactionCount < 200) {
          cy.wait(500).then(() => {
            performAutomaticInteractions();
          });
        }
      });
    }
    
    // Start automatic interaction
    cy.wait(2000).then(() => {
      performAutomaticInteractions();
    });
    
    // Wait for completion or timeout
    cy.wait(30000);
    takeScreenshot('final_state');
  });
}); 