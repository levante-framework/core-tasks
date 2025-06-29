// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
//   originalFn(url, options);
//   
//   if (Cypress.env('takeScreenshots')) {
//     // Wait for initial page load
//     cy.wait(3000);
//     
//     // Check if we need to handle fullscreen mode
//     cy.get('body').then(($body) => {
//       if ($body.text().includes('Switch to Full Screen mode')) {
//         // Wait for user to interact or game to load
//         cy.wait(5000);
//         cy.takeGameScreenshot('after_fullscreen_wait');
//       } else {
//         // Game content is already loaded
//         cy.takeGameScreenshot('game_loaded');
//       }
//     });
//   }
// });

import 'cypress-real-events';

let globalScreenshotCounter = 0;
let screenshotInterval;

// Custom command for taking screenshots with global counter
Cypress.Commands.add('takePageScreenshot', (name) => {
  if (Cypress.env('takeScreenshots')) {
    globalScreenshotCounter++;
    const paddedCounter = globalScreenshotCounter.toString().padStart(4, '0');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${paddedCounter}_${name}_${timestamp}`;
    cy.screenshot(filename, { 
      capture: 'fullPage',
      overwrite: true 
    });
  }
});

// Improved screenshot command that waits for game content
Cypress.Commands.add('takeGameScreenshot', (name) => {
  if (Cypress.env('takeScreenshots')) {
    // Wait for common game elements to appear instead of the fullscreen message
    cy.get('body').then(($body) => {
      // Check if we're in a game (not showing fullscreen message)
      if ($body.text().includes('Switch to Full Screen mode')) {
        // Wait for game content to load
        cy.wait(3000);
        // Try to find game-specific elements
        cy.get('body').should('not.contain', 'Switch to Full Screen mode', { timeout: 10000 });
      }
    });
    
    // Wait a bit more for content to stabilize
    cy.wait(2000);
    
    globalScreenshotCounter++;
    const paddedCounter = globalScreenshotCounter.toString().padStart(4, '0');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${paddedCounter}_${name}_${timestamp}`;
    cy.screenshot(filename, { 
      capture: 'fullPage',
      overwrite: true 
    });
  }
});

// Start continuous screenshot monitoring
Cypress.Commands.add('startContinuousScreenshots', (intervalMs = 3000) => {
  if (Cypress.env('takeScreenshots')) {
    let counter = 0;
    const takePeriodicScreenshot = () => {
      counter++;
      cy.takeGameScreenshot(`continuous_${counter}`);
    };
    
    // Take initial screenshot
    takePeriodicScreenshot();
    
    // Set up interval for continuous screenshots
    screenshotInterval = setInterval(() => {
      try {
        takePeriodicScreenshot();
      } catch (e) {
        // Ignore errors during continuous screenshots
        console.log('Screenshot interval error:', e);
      }
    }, intervalMs);
  }
});

// Stop continuous screenshot monitoring
Cypress.Commands.add('stopContinuousScreenshots', () => {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
});

// Command to take multiple screenshots with short delays
Cypress.Commands.add('captureFrameSequence', (baseName, count = 5, delayMs = 2000) => {
  if (Cypress.env('takeScreenshots')) {
    for (let i = 1; i <= count; i++) {
      cy.wait(delayMs);
      cy.takeGameScreenshot(`${baseName}_seq_${i}`);
    }
  }
});

// Custom command to capture frames after real clicks
Cypress.Commands.add('realClickWithScreenshots', { prevSubject: 'element' }, (subject, options) => {
  if (Cypress.env('takeScreenshots')) {
    cy.takeGameScreenshot('before_real_click');
  }
  
  cy.wrap(subject).realClick(options);
  
  if (Cypress.env('takeScreenshots')) {
    // Take many screenshots at different intervals to catch the transition
    cy.wait(1000);
    cy.takeGameScreenshot('real_click_1s');
    cy.wait(1000);
    cy.takeGameScreenshot('real_click_2s');
    cy.wait(1000);
    cy.takeGameScreenshot('real_click_3s');
    cy.wait(2000);
    cy.takeGameScreenshot('real_click_5s');
    cy.wait(2000);
    cy.takeGameScreenshot('real_click_7s');
    cy.wait(3000);
    cy.takeGameScreenshot('real_click_10s');
    cy.wait(5000);
    cy.takeGameScreenshot('real_click_15s');
  }
});

// Command to click with screenshots
Cypress.Commands.add('clickWithScreenshots', { prevSubject: 'element' }, (subject, options) => {
  if (Cypress.env('takeScreenshots')) {
    cy.takeGameScreenshot('before_click');
  }
  
  cy.wrap(subject).click(options);
  
  if (Cypress.env('takeScreenshots')) {
    cy.wait(500);
    cy.takeGameScreenshot('click_500ms');
    cy.wait(1000);
    cy.takeGameScreenshot('click_1500ms');
    cy.wait(2000);
    cy.takeGameScreenshot('click_3500ms');
    cy.wait(3000);
    cy.takeGameScreenshot('click_6500ms');
  }
});
