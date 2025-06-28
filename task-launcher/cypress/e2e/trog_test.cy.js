import { testAfc } from './helpers.cy.js';

const trog_url = 'http://localhost:8080/?task=trog';

describe('test trog', () => {
  it('visits trog and plays game', () => {
    cy.visit(trog_url);
    
    // Take screenshot of initial TROG page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('trog_initial_page');
    
    testAfc('class', '.image');
    
    // Take screenshot after test completion
    cy.takePageScreenshot('trog_after_test');
  });
});
