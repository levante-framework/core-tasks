import { testAfc } from './helpers.cy.js';

describe('Matrix Reasoning - Complete Screenshot Capture', () => {
  it('captures complete matrix-reasoning task with automatic progression', () => {
    let screenshotCounter = 0;
    let maxSteps = 200; // Increased limit to capture complete task
    let completionDetected = false;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    // Visit with fullscreen mocking using onBeforeLoad (key insight from working tests)
    cy.visit('http://localhost:8080/?task=matrix-reasoning', {
      timeout: 120000,
      onBeforeLoad: (win) => {
        // Enhanced fullscreen mocking before page loads
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
        Object.defineProperty(win.screen, 'orientation', {
          value: { lock: cy.stub().resolves() },
          writable: true
        });
        
        // Mock realClick for Cypress Real Events
        win.Element.prototype.realClick = function() {
          this.click();
          return Promise.resolve();
        };
      }
    });

    // Take initial screenshot
    cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-initial-load`);
    cy.wait(3000);

    // Use the working testAfc pattern but with screenshot capture
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-ok-button-found`);
    
    // Click OK with realClick simulation
    cy.contains('OK').then(($btn) => {
      $btn[0].click(); // Direct click to avoid fullscreen issues
    });
    cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-task-started`);
    cy.wait(2000);

    // Main task loop with screenshot capture
    function taskLoopWithScreenshots(stepNumber) {
      if (stepNumber > maxSteps || completionDetected) {
        console.log(`🏁 Stopping: Step limit (${maxSteps}) reached or completion detected`);
        cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-final-state`);
        return;
      }

      console.log(`📸 Step ${stepNumber}/${maxSteps} - Screenshot ${screenshotCounter}`);

      // Wait for stimulus container
      cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist').then(() => {
        // Take screenshot of current state
        cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-step-${stepNumber}`);
        cy.wait(2000);

        // Check for task completion
        cy.get('body').then(($body) => {
          if ($body.find('footer').length > 0) {
            console.log('🏁 Task completed - found footer');
            completionDetected = true;
            cy.contains('Exit').click({ timeout: 60000 });
            cy.screenshot(`${timestamp}-matrix-reasoning-${(++screenshotCounter).toString().padStart(3, '0')}-task-completed`);
            return;
          }

          // Handle matrix reasoning interactions (based on original test pattern)
          cy.get('.jspsych-content').then((content) => {
            const responseButtons = content.find('.image'); // Matrix reasoning uses .image class
            const correctButtons = content.find('.correct');
            const primaryButtons = content.find('.primary');

            if (correctButtons.length > 0) {
              console.log('🎯 Clicking correct answer');
              cy.get('.correct').click({ timeout: 60000 });
            } else if (responseButtons.length > 1) {
              console.log('🖼️ Clicking matrix image option');
              // Click a random image option for matrix reasoning
              cy.get('.image').then(($images) => {
                const randomIndex = Math.floor(Math.random() * $images.length);
                cy.wrap($images.eq(randomIndex)).click();
              });
            } else if (primaryButtons.length > 0) {
              console.log('▶️ Clicking primary button');
              cy.get('.primary').click({ timeout: 60000 });
            }
          });

          cy.wait(3000);

          // Continue to next step after stimulus container disappears
          cy.get('.lev-stimulus-container', { timeout: 60000 }).should('not.exist').then(() => {
            if (!completionDetected) {
              taskLoopWithScreenshots(stepNumber + 1);
            }
          });
        });
      });
    }

    // Start the enhanced task loop
    taskLoopWithScreenshots(1);
  });
});
