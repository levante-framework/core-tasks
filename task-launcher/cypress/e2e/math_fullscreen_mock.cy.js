describe('Math Test with Fullscreen Mock and Screenshots', () => {
  let screenshotCounter = 0;

  function takeScreenshot(name) {
    if (Cypress.env('takeScreenshots')) {
      screenshotCounter++;
      const paddedCounter = screenshotCounter.toString().padStart(4, '0');
      cy.screenshot(`${paddedCounter}_math_${name}`, { 
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

  it('Math test with fullscreen mocking and comprehensive screenshots', () => {
    const mathUrl = 'http://localhost:8080/?task=math';
    
    cy.visit(mathUrl);
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
          '.lev-response-row button:visible',
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
        
        // Look for math-specific elements
        if (!foundElement) {
          // Look for slider elements
          const sliders = $body.find('input[type="range"]:visible, .slider:visible');
          if (sliders.length > 0) {
            const slider = sliders.first();
            takeScreenshot(`interacting_with_slider_${interactionCount}`);
            // Set slider to middle value
            const min = parseInt(slider.attr('min') || '0');
            const max = parseInt(slider.attr('max') || '100');
            const middle = Math.floor((min + max) / 2);
            slider.val(middle).trigger('input').trigger('change');
            foundElement = true;
          }
        }
        
        // Look for number input fields
        if (!foundElement) {
          const numberInputs = $body.find('input[type="number"]:visible, input[inputmode="numeric"]:visible');
          if (numberInputs.length > 0) {
            const input = numberInputs.first();
            takeScreenshot(`filling_number_input_${interactionCount}`);
            input.val('42').trigger('input').trigger('change');
            foundElement = true;
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