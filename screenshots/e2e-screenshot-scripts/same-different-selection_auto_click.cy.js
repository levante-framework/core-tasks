describe('Same-Different Selection Auto Click', () => {
  let screenshotCounter = 0;

  const takeScreenshot = (label) => {
    const paddedCounter = String(screenshotCounter).padStart(3, '0');
    cy.screenshot(`${paddedCounter}-${label}`);
    screenshotCounter++;
  };

  const clickOkButton = () => {
    cy.get('body').then(($body) => {
      const okButtons = $body.find('button:contains("OK")');
      if (okButtons.length > 0) {
        cy.log('🔘 OK button found, attempting to click...');
        
        // Try multiple click strategies
        cy.get('button:contains("OK")').then(($btn) => {
          if ($btn.is(':disabled')) {
            cy.log('⚠️ OK button is disabled, waiting for it to be enabled...');
            // Wait for button to be enabled (up to 30 seconds)
            cy.get('button:contains("OK")').should('not.be.disabled', { timeout: 30000 }).then(() => {
              cy.log('✅ OK button enabled, clicking now');
              cy.get('button:contains("OK")').click({ force: true });
            });
          } else {
            cy.log('✅ OK button is enabled, clicking now');
            cy.get('button:contains("OK")').click({ force: true });
          }
        });
      }
    });
  };

  it('captures Same-Different Selection with auto-clicking OK buttons', () => {
    cy.visit('http://localhost:8080/?task=same-different-selection&userMetadata.age=8', {
      timeout: 120000,
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
        
        // Mock fullscreen change event
        setTimeout(() => {
          const fullscreenChangeEvent = new Event('fullscreenchange');
          win.document.dispatchEvent(fullscreenChangeEvent);
        }, 100);
      }
    });

    takeScreenshot('page-loaded');

    // Wait for initial load
    cy.wait(2000);
    takeScreenshot('after-initial-wait');

    // Click first OK button to start
    clickOkButton();
    takeScreenshot('after-first-ok-click');

    // Main screenshot loop with auto-clicking
    for (let i = 0; i < 80; i++) { // 80 * 3 seconds = 4 minutes
      cy.wait(3000).then(() => {
        takeScreenshot(`frame-${i + 3}`);
        
        // Auto-click logic
        cy.get('body').then(($body) => {
          const hasOkButton = $body.find('button:contains("OK")').length > 0;
          const hasCorrect = $body.find('.correct').length > 0;
          const hasImages = $body.find('img').length;
          const hasExit = $body.find('button:contains("Exit")').length > 0;
          
          cy.log(`📊 Frame ${i + 3}: OK=${hasOkButton}, correct=${hasCorrect}, images=${hasImages}, exit=${hasExit}`);
          
          if (hasExit) {
            cy.log('🏁 Exit button found - task completed');
            cy.get('button:contains("Exit")').click({ force: true });
          } else if (hasOkButton) {
            cy.log('🔘 Auto-clicking OK button');
            // Check if button is disabled and wait if needed
            cy.get('button:contains("OK")').then(($btn) => {
              if ($btn.is(':disabled')) {
                cy.log('⏳ OK button disabled, waiting...');
                cy.get('button:contains("OK")').should('not.be.disabled', { timeout: 15000 }).then(() => {
                  cy.get('button:contains("OK")').click({ force: true });
                });
              } else {
                cy.get('button:contains("OK")').click({ force: true });
              }
            });
          } else if (hasCorrect) {
            cy.log('✅ Clicking correct answer');
            cy.get('.correct').first().click({ force: true });
          } else if (hasImages >= 2) {
            cy.log('🖼️ Multi AFC - clicking first 2 images');
            cy.get('img').eq(0).click({ force: true });
            cy.get('img').eq(1).click({ force: true });
          }
        });
      });
    }

    cy.then(() => {
      cy.log(`🎉 Auto-click capture completed! Total screenshots: ${screenshotCounter}`);
    });
  });
}); 