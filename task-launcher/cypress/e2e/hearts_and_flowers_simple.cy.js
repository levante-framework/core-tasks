describe('Hearts and Flowers Simple Test', () => {
  it('should take screenshots of actual game content', () => {
    let screenshotCounter = 0;

    function takeScreenshot(name) {
      if (Cypress.env('takeScreenshots')) {
        screenshotCounter++;
        const paddedCounter = screenshotCounter.toString().padStart(4, '0');
        cy.screenshot(`${paddedCounter}_hearts_flowers_${name}`, { 
          capture: 'viewport',
          overwrite: true 
        });
      }
    }

    // Visit the page and mock fullscreen API before any app code runs
    cy.visit('http://localhost:8080/?task=hearts-and-flowers', {
      onBeforeLoad(win) {
        // Aggressively mock fullscreen API
        win.document.documentElement.requestFullscreen = () => Promise.resolve();
        win.document.exitFullscreen = () => Promise.resolve();
        win.document.webkitRequestFullscreen = () => Promise.resolve();
        win.document.mozRequestFullScreen = () => Promise.resolve();
        win.document.msRequestFullscreen = () => Promise.resolve();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'webkitFullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'mozFullScreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'msFullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
      }
    });
    takeScreenshot('initial_visit');
    
    // Wait for page to load
    cy.wait(1000);
    takeScreenshot('page_loaded');

    // Click the fullscreen prompt button if present
    cy.get('body').then(($body) => {
      if ($body.text().includes('Switch to Full Screen mode') || $body.text().includes('Switch to full screen mode')) {
        const possibleButtons = [
          'button:contains("OK")',
          'button:contains("Continue")',
          'button:contains("Start")',
          '.primary',
          '.jspsych-btn'
        ];
        let found = false;
        for (const selector of possibleButtons) {
          const btn = $body.find(selector);
          if (btn.length > 0) {
            cy.wrap(btn.first()).click();
            found = true;
            break;
          }
        }
        if (!found) {
          cy.get('button:visible').first().click();
        }
        cy.wait(1000); // let the app transition
        takeScreenshot('after_fullscreen_click');
      }
    });
    
    // Take screenshots every 1 second for 30 seconds to capture game progression
    for (let i = 1; i <= 30; i++) {
      cy.wait(1000);
      takeScreenshot(`game_progression_${i}`);
    }
    
    // Look for and interact with game elements
    cy.get('body').then(($body) => {
      // Look for game-specific elements
      const gameElements = $body.find('.jspsych-content, .haf-stimulus-holder, .haf-stimulus-container, [alt="heart or flower"]');
      if (gameElements.length > 0) {
        takeScreenshot('game_elements_found');
        
        // Take screenshots every 500ms for 10 seconds when game elements are found
        for (let i = 1; i <= 20; i++) {
          cy.wait(500);
          takeScreenshot(`game_content_${i}`);
        }
      } else {
        takeScreenshot('no_game_elements_found');
      }
    });
    
    // Try to find and click any buttons
    cy.get('body').then(($body) => {
      const buttons = $body.find('button, .btn, [role="button"], .primary, .secondary');
      if (buttons.length > 0) {
        takeScreenshot('found_buttons');
        
        // Click the first button
        cy.wrap(buttons.first()).click();
        takeScreenshot('after_button_click');
        
        // Take screenshots every 500ms for 10 seconds after clicking
        for (let i = 1; i <= 20; i++) {
          cy.wait(500);
          takeScreenshot(`after_click_${i}`);
        }
      } else {
        takeScreenshot('no_buttons_found');
      }
    });
    
    // Final monitoring
    for (let i = 1; i <= 10; i++) {
      cy.wait(1000);
      takeScreenshot(`final_${i}`);
    }
  });
}); 