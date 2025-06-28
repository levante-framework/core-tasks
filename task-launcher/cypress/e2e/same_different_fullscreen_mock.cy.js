describe('Same Different Test with Fullscreen Mock and Screenshots', () => {
  let screenshotCounter = 0;

  function takeScreenshot(name) {
    if (Cypress.env('takeScreenshots')) {
      screenshotCounter++;
      const paddedCounter = screenshotCounter.toString().padStart(4, '0');
      cy.screenshot(`${paddedCounter}_same_different_${name}`, { 
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

  it('Same Different test with fullscreen mocking and comprehensive screenshots', () => {
    const sameDifferentUrl = 'http://localhost:8080/?task=same-different-selection';
    
    cy.visit(sameDifferentUrl);
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
          '.correct:visible',
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
        
        // Look for same-different specific elements
        if (!foundElement) {
          // Look for image elements that might be clickable
          const images = $body.find('img:visible').filter((i, img) => {
            const $img = Cypress.$(img);
            return $img.css('cursor') === 'pointer' || $img.closest('[role="button"]').length > 0;
          });
          
          if (images.length > 0) {
            takeScreenshot(`found_clickable_images_${images.length}_${interactionCount}`);
            
            // Try to find matching images based on alt text or other attributes
            const firstImage = images.first();
            const firstAlt = firstImage.attr('alt') || '';
            
            // Look for another image with similar properties
            let matchFound = false;
            images.each((i, img) => {
              if (i === 0 || matchFound) return; // Skip first image or if match already found
              
              const $img = Cypress.$(img);
              const alt = $img.attr('alt') || '';
              
              // Simple matching logic - look for common dimensions/properties
              if (alt && firstAlt && alt !== firstAlt) {
                const firstProps = firstAlt.split('-');
                const imgProps = alt.split('-');
                
                // Check for any matching properties
                const hasMatch = firstProps.some(prop => imgProps.includes(prop));
                
                if (hasMatch) {
                  takeScreenshot(`found_matching_pair_${i}_${interactionCount}`);
                  firstImage.click();
                  $img.click();
                  matchFound = true;
                  foundElement = true;
                  return false; // Break the loop
                }
              }
            });
            
            // If no match found, just click the first two images
            if (!matchFound && images.length >= 2) {
              takeScreenshot(`clicking_first_two_images_${interactionCount}`);
              images.eq(0).click();
              images.eq(1).click();
              foundElement = true;
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
    cy.wait(40000); // Same different might take longer
    takeScreenshot('final_state');
  });
}); 