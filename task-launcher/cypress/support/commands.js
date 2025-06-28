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
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

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

// Start continuous screenshot monitoring
Cypress.Commands.add('startContinuousScreenshots', (intervalMs = 3000) => {
  if (Cypress.env('takeScreenshots')) {
    let counter = 0;
    const takePeriodicScreenshot = () => {
      counter++;
      cy.takePageScreenshot(`continuous_${counter}`);
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
      cy.takePageScreenshot(`${baseName}_seq_${i}`);
    }
  }
});

// Custom command to capture frames after real clicks
Cypress.Commands.add('realClickWithScreenshots', { prevSubject: 'element' }, (subject, options) => {
  if (Cypress.env('takeScreenshots')) {
    cy.takePageScreenshot('before_real_click');
  }
  
  cy.wrap(subject).realClick(options);
  
  if (Cypress.env('takeScreenshots')) {
    // Take many screenshots at different intervals to catch the transition
    cy.wait(1000);
    cy.takePageScreenshot('real_click_1s');
    cy.wait(1000);
    cy.takePageScreenshot('real_click_2s');
    cy.wait(1000);
    cy.takePageScreenshot('real_click_3s');
    cy.wait(2000);
    cy.takePageScreenshot('real_click_5s');
    cy.wait(2000);
    cy.takePageScreenshot('real_click_7s');
    cy.wait(3000);
    cy.takePageScreenshot('real_click_10s');
    cy.wait(5000);
    cy.takePageScreenshot('real_click_15s');
  }
});

// Command to click with screenshots
Cypress.Commands.add('clickWithScreenshots', { prevSubject: 'element' }, (subject, options) => {
  if (Cypress.env('takeScreenshots')) {
    cy.takePageScreenshot('before_click');
  }
  
  cy.wrap(subject).click(options);
  
  if (Cypress.env('takeScreenshots')) {
    cy.wait(500);
    cy.takePageScreenshot('click_500ms');
    cy.wait(1000);
    cy.takePageScreenshot('click_1500ms');
    cy.wait(2000);
    cy.takePageScreenshot('click_3500ms');
    cy.wait(3000);
    cy.takePageScreenshot('click_6500ms');
  }
});
