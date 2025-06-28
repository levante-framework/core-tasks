const intro_url = 'http://localhost:8080/?task=intro';

describe('intro with fullscreen API mock', () => {
  it('bypasses fullscreen requirement and captures test content', () => {
    let screenshotCounter = 0;
    
    // Function to take screenshots
    const takeScreenshot = (name) => {
      if (Cypress.env('takeScreenshots')) {
        screenshotCounter++;
        const paddedCounter = screenshotCounter.toString().padStart(4, '0');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cy.screenshot(`${paddedCounter}_${name}_${timestamp}`, { 
          capture: 'fullPage',
          overwrite: true 
        });
      }
    };

    cy.visit(intro_url);
    takeScreenshot('initial_visit');
    
    // Mock fullscreen API before any interactions
    cy.window().then((win) => {
      // Mock the fullscreen API comprehensively
      win.document.requestFullscreen = cy.stub().resolves();
      win.document.exitFullscreen = cy.stub().resolves();
      win.document.fullscreenElement = win.document.documentElement;
      win.document.fullscreenEnabled = true;
      
      // Mock fullscreen events
      Object.defineProperty(win.document, 'fullscreenElement', {
        value: win.document.documentElement,
        writable: true
      });
      
      // Override element.requestFullscreen for all elements
      win.Element.prototype.requestFullscreen = cy.stub().resolves();
      win.HTMLElement.prototype.requestFullscreen = cy.stub().resolves();
      
      // Mock fullscreen change event
      const fullscreenChangeEvent = new Event('fullscreenchange');
      win.document.dispatchEvent(fullscreenChangeEvent);
      
      takeScreenshot('fullscreen_api_mocked');
    });
    
    // Wait for page to load
    cy.wait(3000);
    takeScreenshot('page_loaded');
    
    // Try to find OK button with multiple strategies
    cy.get('body').then($body => {
      if ($body.text().includes('OK')) {
        takeScreenshot('ok_button_detected_in_text');
        
        // Try multiple selectors for OK button
        const okSelectors = [
          'button:contains("OK")',
          '[data-testid*="ok"]',
          '.ok-button',
          '.btn:contains("OK")',
          'button[type="button"]:contains("OK")',
          '*:contains("OK")'
        ];
        
        for (const selector of okSelectors) {
          cy.get('body').then($b => {
            if ($b.find(selector).length > 0) {
              takeScreenshot(`ok_found_with_${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
              cy.get(selector).first().click({ force: true });
              takeScreenshot(`ok_clicked_with_${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
              return false; // Break out of loop
            }
          });
        }
        
        // Fallback: try contains
        cy.contains('OK').then($ok => {
          if ($ok.length > 0) {
            takeScreenshot('ok_found_with_contains');
            cy.contains('OK').click({ force: true });
            takeScreenshot('ok_clicked_with_contains');
          }
        });
      }
    });
    
    // Wait and take screenshots to monitor progress
    for (let i = 1; i <= 30; i++) {
      cy.wait(1000);
      takeScreenshot(`monitoring_${i}s`);
      
      // Try to interact with any clickable elements that appear
      cy.get('body').then($body => {
        // Look for various button types
        const buttonSelectors = [
          'button:visible',
          '.btn:visible',
          '.primary:visible',
          '.secondary:visible',
          '[role="button"]:visible',
          '.jspsych-btn:visible',
          'input[type="button"]:visible',
          'input[type="submit"]:visible'
        ];
        
        buttonSelectors.forEach(selector => {
          if ($body.find(selector).length > 0) {
            takeScreenshot(`found_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_at_${i}s`);
            cy.get(selector).first().click({ force: true });
            takeScreenshot(`clicked_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_at_${i}s`);
          }
        });
        
        // Check for specific jsPsych content
        if ($body.find('.jspsych-content').length > 0) {
          takeScreenshot(`jspsych_content_found_at_${i}s`);
          
          // Try to click any buttons within jsPsych content
          cy.get('.jspsych-content').within(() => {
            cy.get('button, .btn, input[type="button"]').then($buttons => {
              if ($buttons.length > 0) {
                takeScreenshot(`jspsych_buttons_found_at_${i}s`);
                cy.get('button, .btn, input[type="button"]').first().click({ force: true });
                takeScreenshot(`jspsych_button_clicked_at_${i}s`);
              }
            });
          });
        }
        
        // Check for stimulus container
        if ($body.find('.lev-stimulus-container').length > 0) {
          takeScreenshot(`stimulus_container_found_at_${i}s`);
        }
      });
    }
    
    // Final comprehensive button search and click
    cy.get('body').then($body => {
      takeScreenshot('final_page_state');
      
      const allClickableSelectors = [
        'button',
        '.btn', 
        '.primary',
        '.secondary',
        '[role="button"]',
        '.jspsych-btn',
        'input[type="button"]',
        'input[type="submit"]',
        '.clickable',
        '[onclick]'
      ];
      
      allClickableSelectors.forEach(selector => {
        cy.get(selector).then($elements => {
          if ($elements.length > 0) {
            takeScreenshot(`final_found_${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
            $elements.each((index, element) => {
              cy.wrap(element).click({ force: true });
              takeScreenshot(`final_clicked_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${index}`);
              cy.wait(2000);
              takeScreenshot(`final_after_click_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${index}`);
            });
          }
        });
      });
    });
  });
}); 