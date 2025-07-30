describe('Mental Rotation 120 Frames Capture', () => {
  let screenshotCounter = 0;
  let lastContentHash = '';

  const takeScreenshot = (label) => {
    const paddedCounter = String(screenshotCounter).padStart(3, '0');
    cy.screenshot(`${paddedCounter}-${label}`);
    screenshotCounter++;
  };

  const getContentHash = ($body) => {
    const visibleText = $body.find(':visible').text().trim();
    const visibleElements = $body.find(':visible').length;
    const buttons = $body.find('button:visible').length;
    const imageButtons = $body.find('.image-large').length;
    return `${visibleText.length}-${visibleElements}-${buttons}-${imageButtons}`;
  };

  const aggressiveInteraction = () => {
    cy.get('body').then(($body) => {
      let interactionMade = false;

      // Strategy 1: Enabled buttons first
      if (!interactionMade && $body.find('button:contains("OK"):not(:disabled)').length > 0) {
        cy.log('📋 Clicking enabled OK button');
        cy.get('button:contains("OK"):not(:disabled)').first().click({ force: true });
        interactionMade = true;
      } else if (!interactionMade && $body.find('button:contains("Continue"):not(:disabled)').length > 0) {
        cy.log('📋 Clicking enabled Continue button');
        cy.get('button:contains("Continue"):not(:disabled)').first().click({ force: true });
        interactionMade = true;
      } else if (!interactionMade && $body.find('.primary:not(:disabled)').length > 0) {
        cy.log('📋 Clicking enabled primary button');
        cy.get('.primary:not(:disabled)').first().click({ force: true });
        interactionMade = true;
      }

      // Strategy 2: Mental Rotation answers
      if (!interactionMade && $body.find('.image-large').length >= 2) {
        cy.log('🧠 Mental Rotation question - clicking answer');
        if ($body.find('.correct').length > 0) {
          cy.log('✅ Clicking correct answer');
          cy.get('.correct').first().click({ force: true });
        } else {
          cy.log('🎲 Clicking random answer');
          cy.get('.image-large').first().click({ force: true });
        }
        interactionMade = true;
      }

      // Strategy 3: Force click disabled buttons if nothing else works
      if (!interactionMade && $body.find('button:contains("OK")').length > 0) {
        cy.log('🔨 Force clicking disabled OK button');
        cy.get('button:contains("OK")').first().click({ force: true });
        interactionMade = true;
      } else if (!interactionMade && $body.find('button:contains("Continue")').length > 0) {
        cy.log('🔨 Force clicking disabled Continue button');
        cy.get('button:contains("Continue")').first().click({ force: true });
        interactionMade = true;
      } else if (!interactionMade && $body.find('.primary').length > 0) {
        cy.log('🔨 Force clicking disabled primary button');
        cy.get('.primary').first().click({ force: true });
        interactionMade = true;
      }

      // Strategy 4: Click any button at all
      if (!interactionMade && $body.find('button').length > 0) {
        cy.log('🔨 Force clicking any button');
        cy.get('button').first().click({ force: true });
        interactionMade = true;
      }

      // Strategy 5: Press Enter key
      if (!interactionMade) {
        cy.log('⌨️ Pressing Enter key');
        cy.get('body').type('{enter}');
        interactionMade = true;
      }

      // Strategy 6: Click Exit if available
      if ($body.find('button:contains("Exit")').length > 0) {
        cy.log('🚪 Exit button found - clicking');
        cy.get('button:contains("Exit")').click({ force: true });
      }
    });
  };

  it('captures exactly 120 Mental Rotation screenshots', () => {
    cy.visit('http://localhost:8080/?task=mental-rotation', {
      timeout: 60000,
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
      }
    });

    takeScreenshot('page-loaded');

    // Wait for initial load
    cy.wait(3000);
    takeScreenshot('after-initial-wait');

    // Click initial OK button
    cy.contains('OK', { timeout: 30000 }).should('be.visible').then(() => {
      takeScreenshot('ok-button-visible');
      cy.contains('OK').click({ force: true });
      takeScreenshot('after-ok-click');
    });

    // Calculate timing for exactly 120 frames
    // We already have 4 screenshots, so we need 116 more
    const remainingScreenshots = 116;
    const screenshotInterval = 3000; // 3 seconds between screenshots
    const totalDuration = remainingScreenshots * screenshotInterval; // About 6 minutes

    cy.log(`📸 Taking ${remainingScreenshots} more screenshots over ${totalDuration/1000} seconds`);

    for (let i = 0; i < remainingScreenshots; i++) {
      cy.wait(screenshotInterval).then(() => {
        // Take screenshot with frame number
        cy.get('body').then(($body) => {
          const frameNumber = screenshotCounter;
          
          if ($body.find('.image-large').length >= 2) {
            takeScreenshot(`frame-${frameNumber}-mental-rotation-question`);
          } else if ($body.find('video').length > 0) {
            takeScreenshot(`frame-${frameNumber}-instruction-video`);
          } else if ($body.find('img').length > 0) {
            takeScreenshot(`frame-${frameNumber}-instruction-image`);
          } else if ($body.find('footer').length > 0) {
            takeScreenshot(`frame-${frameNumber}-task-complete`);
          } else {
            takeScreenshot(`frame-${frameNumber}-instruction`);
          }
        });

        // Always try interaction
        aggressiveInteraction();

        // Check for completion but continue to 120 frames regardless
        cy.get('body').then(($body) => {
          const bodyText = $body.text().toLowerCase();
          if (bodyText.includes('thank you') || bodyText.includes('complete') || 
              bodyText.includes('finished') || $body.find('footer').length > 0) {
            cy.log(`🎉 Task completed at frame ${screenshotCounter}, but continuing to 120 frames`);
          }
        });

        // Log progress every 10 frames
        if ((screenshotCounter % 10) === 0) {
          cy.log(`📸 Progress: ${screenshotCounter}/120 frames captured`);
        }
      });
    }

    // Ensure we have exactly 120 screenshots
    cy.then(() => {
      cy.log(`🎉 Mental Rotation capture completed with exactly ${screenshotCounter} screenshots!`);
      
      // Take one final screenshot if we're somehow under 120
      if (screenshotCounter < 120) {
        const remaining = 120 - screenshotCounter;
        cy.log(`📸 Taking ${remaining} final screenshots to reach 120`);
        for (let i = 0; i < remaining; i++) {
          takeScreenshot(`final-frame-${screenshotCounter}`);
        }
      }
    });
  });
}); 