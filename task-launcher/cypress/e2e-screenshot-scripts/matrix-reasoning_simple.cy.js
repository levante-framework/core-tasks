describe('matrix-reasoning Complete Task Capture', () => {
  it('should capture screenshots throughout entire task', () => {
    let screenshotCounter = 0;
    let stuckCounter = 0;
    let maxStuckAttempts = 3;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    // Handle uncaught exceptions (especially fullscreen errors)
    Cypress.on('uncaught:exception', (err, runnable) => {
      // Don't fail the test on fullscreen permission errors
      if (err.message.includes('Permissions check failed') || 
          err.message.includes('fullscreen') ||
          err.message.includes('requestFullscreen')) {
        console.log('Ignoring fullscreen error:', err.message);
        return false;
      }
      return true;
    });
    
    // Visit with comprehensive fullscreen mocking using onBeforeLoad
    cy.visit('http://localhost:8080?task=matrix-reasoning', {
      onBeforeLoad: (win) => {
        // Comprehensive fullscreen API mocking
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        
        // Mock all fullscreen properties
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
        Object.defineProperty(win.document, 'webkitFullscreenEnabled', {
          get: () => true,
          configurable: true
        });
        Object.defineProperty(win.document, 'mozFullScreenEnabled', {
          get: () => true,
          configurable: true
        });
        
        // Mock screen orientation
        Object.defineProperty(win.screen, 'orientation', {
          value: { 
            lock: cy.stub().resolves(),
            unlock: cy.stub().resolves(),
            angle: 0,
            type: 'landscape-primary'
          },
          writable: true
        });
        
        // Mock permissions API
        if (win.navigator.permissions) {
          win.navigator.permissions.query = cy.stub().resolves({ state: 'granted' });
        }
      }
    });
    
    // Take initial screenshot
    cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-start`);
    
    // Capture screenshots with enhanced stuck detection
    for (let i = 1; i <= 100; i++) {
      // Wait 5 seconds
      cy.wait(5 * 1000);
      
      // Check for completion first
      cy.get('body').then(($body) => {
        if ($body.find('footer').length > 0) {
          console.log('🏁 Task completed - found footer');
          cy.contains('Exit').click({ timeout: 60000 });
          cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-completed`);
          return;
        }
        
        // Check if we're stuck (empty screen or no interactive elements)
        const hasContent = $body.find('.lev-stimulus-container, .jspsych-content, button, .image, .primary').length > 0;
        const hasInteractiveElements = $body.find('button:not([disabled]), .image, .primary, .correct, [data-choice]').length > 0;
        
        if (!hasContent || !hasInteractiveElements) {
          stuckCounter++;
          console.log(`⚠️ Stuck detection: ${stuckCounter}/${maxStuckAttempts} - No content or interactive elements`);
          
          if (stuckCounter >= maxStuckAttempts) {
            console.log('🔄 Attempting restart due to stuck state');
            // Try to restart by refreshing and continuing
            cy.reload();
            cy.wait(3000);
            stuckCounter = 0; // Reset stuck counter after reload
          } else {
            // Try some fallback interactions
            cy.get('body').click('center');
            cy.wait(1000);
            cy.get('body').type('{enter}');
            cy.wait(1000);
            cy.get('body').type(' ');
          }
        } else {
          stuckCounter = 0; // Reset stuck counter if we have content
          
          // Try interactions before taking screenshot
          // Strategy 1: Continue/OK/Next buttons
          if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').length > 0) {
            console.log(`Step ${i}: Clicking navigation button`);
            cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').first().click();
          }
          // Strategy 2: Matrix reasoning specific - correct answers
          else if ($body.find('.correct').length > 0) {
            console.log(`Step ${i}: Clicking correct answer`);
            cy.get('.correct').first().click();
          }
          // Strategy 3: Matrix reasoning specific - image options
          else if ($body.find('.image').length > 1) {
            console.log(`Step ${i}: Clicking matrix image option`);
            cy.get('.image').then(($images) => {
              const randomIndex = Math.floor(Math.random() * $images.length);
              cy.wrap($images.eq(randomIndex)).click();
            });
          }
          // Strategy 4: Task-specific elements
          else if ($body.find('[data-choice], .choice-button, .response-button').length > 0) {
            console.log(`Step ${i}: Clicking choice button`);
            cy.get('[data-choice], .choice-button, .response-button').first().click();
          }
          // Strategy 5: Primary buttons
          else if ($body.find('.primary').length > 0) {
            console.log(`Step ${i}: Clicking primary button`);
            cy.get('.primary').first().click();
          }
          // Strategy 6: Any enabled buttons
          else if ($body.find('button:not([disabled])').length > 0) {
            console.log(`Step ${i}: Clicking any enabled button`);
            cy.get('button:not([disabled])').first().click();
          }
          // Strategy 7: Random button selection for multiple choice tasks
          else if ($body.find('button').length >= 2) {
            console.log(`Step ${i}: Random button selection`);
            // Randomly click one of the available buttons
            const buttonIndex = Math.floor(Math.random() * $body.find('button').length);
            cy.get('button').eq(buttonIndex).click();
          }
          // Strategy 8: Fallback interactions
          else {
            console.log(`Step ${i}: Fallback interaction`);
            cy.get('body').click('center');
            cy.wait(500);
            cy.get('body').type('{space}');
          }
        }
        
        // Take screenshot
        cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-step-${i}`);
      });
    }
    
    // Final screenshot
    cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-final`);
  });
});
