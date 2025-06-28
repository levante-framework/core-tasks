import { testAfc } from './helpers.cy.js';

const vocab_url = 'http://localhost:8080/?task=vocab';

describe('test vocab', () => {
  it('visits vocab and plays game', () => {
    cy.visit(vocab_url);
    
    // Take screenshot of initial vocab page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('vocab_initial_page');
    
    testAfc('class', '.image');
    
    // Take screenshot after test completion
    cy.takePageScreenshot('vocab_after_test');
  });
});
