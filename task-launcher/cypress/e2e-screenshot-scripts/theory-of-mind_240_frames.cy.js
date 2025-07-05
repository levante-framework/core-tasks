describe('Theory of Mind 240 Frames Capture', () => {
  let screenshotCounter = 0;
  let taskCompleted = false;

  const takeScreenshot = (label) => {
    const paddedCounter = String(screenshotCounter).padStart(3, '0');
    cy.screenshot(`${paddedCounter}-${label}`);
    screenshotCounter++;
  };

  const smartInteraction = () => {
    cy.get('body').then(($body) => {
      let interactionMade = false;

      // Strategy 1: Theory of Mind questions (highest priority)
      if (!interactionMade && $body.find('.image').length >= 2) {
        cy.log('🧠 Theory of Mind question detected');
        if ($body.find('.correct').length > 0) {
          cy.log('✅ Clicking correct answer');
          cy.get('.correct').first().click({ force: true });
        } else {
          cy.log('🎲 Clicking first theory of mind option');
          cy.get('.image').first().click({ force: true });
        }
        interactionMade = true;
      }

      // Strategy 2: Navigation buttons
      if (!interactionMade && $body.find('button:contains("OK"):not(:disabled)').length > 0) {
        cy.log('📋 Clicking OK button');
        cy.get('button:contains("OK"):not(:disabled)').first().click({ force: true });
        interactionMade = true;
      } else if (!interactionMade && $body.find('button:contains("Continue"):not(:disabled)').length > 0) {
        cy.log('📋 Clicking Continue button');
        cy.get('button:contains("Continue"):not(:disabled)').first().click({ force: true });
        interactionMade = true;
      } else if (!interactionMade && $body.find('.primary:not(:disabled)').length > 0) {
        cy.log('📋 Clicking primary button');
        cy.get('.primary:not(:disabled)').first().click({ force: true });
        interactionMade = true;
      }

      // Strategy 3: Force click if needed
      if (!interactionMade && $body.find('button:contains("OK")').length > 0) {
        cy.log('🔨 Force clicking OK button');
        cy.get('button:contains("OK")').first().click({ force: true });
        interactionMade = true;
      }

      // Strategy 4: Any button
      if (!interactionMade && $body.find('button:not(:disabled)').length > 0) {
        cy.log('🔨 Clicking any available button');
        cy.get('button:not(:disabled)').first().click({ force: true });
        interactionMade = true;
      }

      // Strategy 5: Exit detection
      if ($body.find('button:contains("Exit")').length > 0) {
        cy.log('🚪 Exit button detected');
        taskCompleted = true;
      }
    });
  };

  it('captures exactly 240 Theory of Mind screenshots', () => {
    cy.visit('http://localhost:8080/?task=theory-of-mind', {
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

    // Handle initial OK button more robustly
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("OK")').length > 0) {
        takeScreenshot('ok-button-visible');
        cy.contains('OK').click({ force: true });
        takeScreenshot('after-ok-click');
      } else {
        takeScreenshot('no-ok-button');
      }
    });

    // Main capture loop - exactly 240 frames
    const totalFrames = 240;
    const screenshotInterval = 2500; // 2.5 seconds
    
    cy.log(`📸 Starting capture of ${totalFrames} frames at ${screenshotInterval}ms intervals`);
    cy.log(`⏱️  Total estimated time: ${(totalFrames * screenshotInterval) / 1000 / 60} minutes`);

    for (let i = 4; i < totalFrames; i++) { // Start from 4 since we already have 4 screenshots
      cy.wait(screenshotInterval).then(() => {
        // Take screenshot
        cy.get('body').then(($body) => {
          if ($body.find('.image').length >= 2) {
            takeScreenshot(`frame-${i}-theory-of-mind-question`);
          } else if ($body.find('video').length > 0) {
            takeScreenshot(`frame-${i}-video`);
          } else if ($body.find('footer').length > 0) {
            takeScreenshot(`frame-${i}-complete`);
          } else {
            takeScreenshot(`frame-${i}-instruction`);
          }
        });

        // Try interaction (but don't let it fail the test)
        cy.get('body').then(() => {
          try {
            smartInteraction();
          } catch (error) {
            cy.log(`⚠️ Interaction failed at frame ${i}, continuing...`);
          }
        });

        // Progress logging every 20 frames
        if (i % 20 === 0) {
          cy.log(`📸 Progress: ${i}/${totalFrames} frames captured (${Math.round((i/totalFrames)*100)}%)`);
        }

        // Check for task completion but continue regardless
        cy.get('body').then(($body) => {
          const bodyText = $body.text().toLowerCase();
          if (bodyText.includes('thank you') || bodyText.includes('complete') || 
              bodyText.includes('finished') || $body.find('footer').length > 0) {
            cy.log(`🎉 Task completed at frame ${i}, but continuing to ${totalFrames} frames`);
          }
        });
      });
    }

    // Final validation
    cy.then(() => {
      cy.log(`🎉 Theory of Mind 240 frames capture completed! Total screenshots: ${screenshotCounter}`);
      
      // Ensure we have exactly 240 screenshots
      if (screenshotCounter < 240) {
        const remaining = 240 - screenshotCounter;
        cy.log(`📸 Taking ${remaining} final screenshots to reach 240`);
        for (let i = 0; i < remaining; i++) {
          takeScreenshot(`final-${screenshotCounter}`);
        }
      }
    });
  });
}); 