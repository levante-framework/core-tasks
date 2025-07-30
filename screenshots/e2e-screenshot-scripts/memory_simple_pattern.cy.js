describe('Memory Game Simple Pattern Capture', () => {
  let taskCompleted = false;
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
    const corsiBlocks = $body.find('.jspsych-corsi-block').length;
    const highlightedBlocks = $body.find('.jspsych-corsi-block[style*="background"]').length;
    return `${visibleText.length}-${visibleElements}-${buttons}-${corsiBlocks}-${highlightedBlocks}`;
  };

  // Simplified memory game loop that doesn't rely on cypressData
  function memoryLoop() {
    cy.get('.jspsych-content').then((content) => {
      const corsiBlocks = content.find('.jspsych-corsi-block');

      // Take screenshot of current state
      cy.get('body').then(($body) => {
        const currentHash = getContentHash($body);
        if (currentHash !== lastContentHash) {
          if (corsiBlocks.length > 0) {
            takeScreenshot('corsi-blocks-visible');
          } else {
            takeScreenshot('instruction-screen');
          }
          lastContentHash = currentHash;
        }
      });

      if (corsiBlocks.length > 0) {
        // Check if this is display phase (blocks not clickable yet) or input phase
        cy.get('body').then(($body) => {
          const bodyText = $body.text().toLowerCase();
          
          if (bodyText.includes('watch') || bodyText.includes('remember') || bodyText.includes('sequence')) {
            // Display phase - just wait for it to complete
            cy.log('📺 Display phase detected - waiting for sequence to complete');
            takeScreenshot('display-phase-active');
            cy.wait(4000); // Wait for display sequence to complete
            
            // Wait for input phase to begin
            cy.get('p').should('exist');
            takeScreenshot('input-phase-ready');
            
            // Click first few blocks in a simple pattern
            cy.get('.jspsych-corsi-block').then($blocks => {
              if ($blocks.length > 0) {
                cy.log(`🎯 Clicking first 2 blocks out of ${$blocks.length}`);
                cy.wrap($blocks[0]).click();
                cy.wait(500);
                if ($blocks.length > 1) {
                  cy.wrap($blocks[1]).click();
                }
                takeScreenshot('after-clicking-blocks');
              }
            });
          } else {
            // Input phase already active
            cy.log('🖱️ Input phase detected - clicking blocks');
            takeScreenshot('input-phase-active');
            
            cy.get('.jspsych-corsi-block').then($blocks => {
              if ($blocks.length > 0) {
                cy.log(`🎯 Clicking first 2 blocks out of ${$blocks.length}`);
                cy.wrap($blocks[0]).click();
                cy.wait(500);
                if ($blocks.length > 1) {
                  cy.wrap($blocks[1]).click();
                }
                takeScreenshot('after-clicking-blocks');
              }
            });
          }
        });
      } else {
        handleInstructions();
      }
    });

    // Check for completion
    cy.get('body').then(($body) => {
      const bodyText = $body.text().toLowerCase();
      if (bodyText.includes('thank you') || bodyText.includes('exit') || bodyText.includes('complete')) {
        takeScreenshot('task-completed');
        cy.log(`🎉 Memory game capture completed with ${screenshotCounter} screenshots!`);
        taskCompleted = true;
        return;
      } else {
        if (!taskCompleted) {
          cy.wait(2000).then(() => {
            memoryLoop();
          });
        }
      }
    });
  }

  function handleInstructions() {
    cy.get('body').then(($body) => {
      const currentHash = getContentHash($body);
      if (currentHash !== lastContentHash) {
        takeScreenshot('instruction-screen');
        lastContentHash = currentHash;
      }

      // Check for different types of buttons
      if ($body.find('button:contains("OK")').length > 0) {
        cy.log('📋 Clicking OK button');
        cy.contains('OK').click();
      } else if ($body.find('button:contains("Next")').length > 0) {
        cy.log('📋 Clicking Next button');
        cy.contains('Next').click();
      } else if ($body.find('button:contains("Continue")').length > 0) {
        cy.log('📋 Clicking Continue button');
        cy.contains('Continue').click();
      } else if ($body.find('button:contains("Exit")').length > 0) {
        cy.log('📋 Clicking Exit button');
        takeScreenshot('task-ending');
        cy.contains('Exit').click();
        taskCompleted = true;
      } else if ($body.find('button').length > 0) {
        cy.log('📋 Clicking first available button');
        cy.get('button').first().click();
      }
    });
  }

  it('captures Memory game screenshots using simple pattern', () => {
    cy.visit('http://localhost:8080/?task=memory-game', {
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

    // Look for OK button to start
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("OK")').length > 0) {
        takeScreenshot('ok-button-visible');
        cy.contains('OK').click({ force: true });
        takeScreenshot('after-ok-click');
      }
    });

    // Start the main loop
    cy.wait(2000).then(() => {
      memoryLoop();
    });

    // Final cleanup
    cy.then(() => {
      if (!taskCompleted) {
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("Exit")').length > 0) {
            cy.contains('Exit').click();
            takeScreenshot('final-exit');
          }
        });
      }
    });
  });
}); 