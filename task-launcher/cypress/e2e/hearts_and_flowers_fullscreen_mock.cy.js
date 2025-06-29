describe('Hearts and Flowers Test with Fullscreen Mock and Many Screenshots', () => {
  let screenshotCounter = 0;

  function takeScreenshot(name) {
    if (Cypress.env('takeScreenshots')) {
      screenshotCounter++;
      const paddedCounter = screenshotCounter.toString().padStart(3, '0');
      cy.screenshot(`${paddedCounter}_hearts_flowers_${name}`, { 
        capture: 'viewport',
        overwrite: true 
      });
    }
  }

  function reapplyFullscreenMocks() {
    cy.window().then((win) => {
      // Set multiple test environment flags
      win.Cypress = true;
      win.cypress = true;
      win.__cypress = true;
      win.cy = true;
      win.__test__ = true;
      win.__TEST__ = true;
      
      // Replace fscreen with a complete mock
      win.fscreen = {
        fullscreenElement: win.document.documentElement,
        requestFullscreen: () => Promise.resolve(),
        exitFullscreen: () => Promise.resolve(),
        fullscreenEnabled: true,
        fullscreenchange: 'fullscreenchange',
        fullscreenerror: 'fullscreenerror'
      };
      
      // Mock fullscreen API properties
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement,
        configurable: true
      });
    });
  }

  function isInFullscreenMode() {
    return cy.window().then((win) => {
      return !!(win.document.fullscreenElement || 
                win.document.webkitFullscreenElement || 
                win.document.mozFullScreenElement || 
                win.document.msFullscreenElement);
    });
  }

  function detectGamePhase() {
    return cy.get('body').then(($body) => {
      const text = $body.text().toLowerCase();
      const html = $body.html();
      
      if (html.includes('jspsych-btn') || text.includes('continue')) {
        return 'instruction_phase';
      } else if (html.includes('stimulus') || html.includes('heart') || html.includes('flower')) {
        return 'game_active';
      } else if (text.includes('loading') || text.includes('please wait')) {
        return 'loading';
      } else if (text.includes('fullscreen')) {
        return 'fullscreen_prompt';
      } else {
        return 'unknown';
      }
    });
  }

  it('should bypass fullscreen and take comprehensive screenshots of hearts and flowers task', () => {
    // Visit with fullscreen mocks applied before page load
    cy.visit('http://localhost:8084/?task=hearts-and-flowers&cypress=true&test=true', {
      onBeforeLoad: (win) => {
        // Apply mocks before any app code runs
        win.Cypress = true;
        win.cypress = true;
        win.__cypress = true;
        win.cy = true;
        win.__test__ = true;
        win.__TEST__ = true;
        
        // Mock fscreen completely
        win.fscreen = {
          fullscreenElement: win.document.documentElement,
          requestFullscreen: () => Promise.resolve(),
          exitFullscreen: () => Promise.resolve(),
          fullscreenEnabled: true,
          fullscreenchange: 'fullscreenchange',
          fullscreenerror: 'fullscreenerror'
        };
        
        // Mock fullscreen API
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
      }
    });

    // Initial screenshot
    takeScreenshot('initial_visit');
    
    // Wait for page to load
    cy.wait(2000);
    takeScreenshot('page_loaded');
    
    // Phase 1: Monitor initial loading and instructions (reduced frequency - every 1.25 seconds for 15 seconds)
    for (let i = 0; i < 12; i++) {
      cy.wait(1250); // 1.25 seconds instead of 250ms
      reapplyFullscreenMocks();
      
      detectGamePhase().then((phase) => {
        takeScreenshot(`phase_${phase}_${i + 1}`);
        
        // Click any continue buttons that appear
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("Continue"), .jspsych-btn, button[id*="continue"]').length > 0) {
            cy.get('button:contains("Continue"), .jspsych-btn, button[id*="continue"]').first().click({ force: true });
            cy.wait(500);
            takeScreenshot(`after_button_click_${i + 1}`);
          }
        });
      });
    }
    
    // Phase 2: Game monitoring (reduced frequency - every 1.25 seconds for 25 seconds)
    for (let i = 0; i < 20; i++) {
      cy.wait(1250); // 1.25 seconds instead of 250ms
      reapplyFullscreenMocks();
      
      detectGamePhase().then((phase) => {
        takeScreenshot(`game_monitoring_${phase}_${i + 1}`);
        
        // Interact with game elements if present
        cy.get('body').then(($body) => {
          if ($body.find('.stimulus, [data-choice], button:not([disabled])').length > 0) {
            // Try to interact with game elements
            cy.get('.stimulus, [data-choice], button:not([disabled])').first().click({ force: true });
            cy.wait(300);
            takeScreenshot(`after_game_interaction_${i + 1}`);
          }
        });
      });
    }
    
    // Phase 3: Extended monitoring (reduced frequency - every 2.5 seconds for 25 seconds)  
    for (let i = 0; i < 10; i++) {
      cy.wait(2500); // 2.5 seconds
      reapplyFullscreenMocks();
      
      detectGamePhase().then((phase) => {
        takeScreenshot(`extended_monitoring_${phase}_${i + 1}`);
      });
    }
    
    // Final screenshot
    takeScreenshot('final_state');
  });
}); 