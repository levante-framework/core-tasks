import { instructions } from './helpers.cy.js';

const intro_url = 'http://localhost:8080/?task=intro';

describe('test intro', () => {
  it('visits intro and clicks through instructions', () => {
    cy.visit(intro_url);
    
    // Take screenshot after visit
    cy.get('body').should('exist');
    cy.wait(1000);
    cy.takePageScreenshot('visit_initial');
    
    // Take screenshot of initial intro page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('intro_initial_page');
    
    // wait for OK button to be visible
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    
    // Take screenshot with OK button visible
    cy.takePageScreenshot('intro_ok_button_visible');

    if (Cypress.env('takeScreenshots')) {
      cy.contains('OK').realClickWithScreenshots(); // Use our custom command for screenshots
    } else {
      cy.contains('OK').realClick(); // Use normal realClick when screenshots disabled
    }
    
    // Take screenshot after clicking OK
    cy.wait(2000);
    cy.takePageScreenshot('intro_after_ok_click');
    
    // Capture frames to see fullscreen content
    cy.captureFrameSequence('intro_fullscreen_frames', 4, 2000);
    
    instructions();
    
    // Take screenshot after instructions
    cy.takePageScreenshot('intro_after_instructions');
  });
});
