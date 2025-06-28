import { testAfc } from './helpers.cy.js';

const theory_of_mind_url = 'http://localhost:8080/?task=theory-of-mind';

describe('test theory of mind', () => {
  it('visits theory of mind and plays game', () => {
    cy.visit(theory_of_mind_url);
    
    // Take screenshot of initial theory of mind page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('theory_of_mind_initial_page');
    
    testAfc('class', '.image');
    
    // Take screenshot after test completion
    cy.takePageScreenshot('theory_of_mind_after_test');
  });
});
