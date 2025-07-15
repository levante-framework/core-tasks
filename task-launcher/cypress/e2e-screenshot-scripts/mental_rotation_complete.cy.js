const mental_rotation_url = 'http://localhost:8080/?task=mental-rotation';

describe('Mental-rotation Complete Run', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('runs complete mental-rotation with screenshots', () => {
    // Visit with fullscreen mocking and extended timeout
    cy.visit(mental_rotation_url, {
      timeout: 60000,
      onBeforeLoad: (win) => {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
      }
    });

    // Initial screenshot
    takeScreenshot('initial-load');
    
    // Run for 3 minutes with screenshots every 10 seconds
    const totalDuration = 3 * 60 * 1000; // 3 minutes
    const screenshotInterval = 10 * 1000; // 10 seconds
    const numScreenshots = Math.floor(totalDuration / screenshotInterval);
    
    // Take screenshots at regular intervals
    for (let i = 1; i <= numScreenshots; i++) {
      cy.wait(screenshotInterval);
      takeScreenshot(`interval-${i.toString().padStart(2, '0')}`);
      
      // Try to interact with common elements (non-blocking)
      cy.get('body').then(($body) => {
        // Click OK buttons if they exist
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        }
        // Click Continue buttons if they exist  
        if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        }
        // Click Next buttons if they exist
        if ($body.find('button:contains("Next")').length > 0) {
          cy.get('button:contains("Next")').first().click({ force: true });
        }
        // Click Start buttons if they exist
        if ($body.find('button:contains("Start")').length > 0) {
          cy.get('button:contains("Start")').first().click({ force: true });
        }
        // Click any visible buttons as fallback
        if ($body.find('button:visible').length > 0) {
          cy.get('button:visible').first().click({ force: true });
        }
      });
    }
    
    // Final screenshot
    takeScreenshot('final-state');
  });
});
