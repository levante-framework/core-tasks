import { testAfc } from './helpers.cy.js';

const math_url = 'http://localhost:8080/?task=egma-math';

describe('test math', () => {
  it('visits math and plays game', () => {
    cy.visit(math_url);
    
    // Take screenshot of initial math page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('math_initial_page');
    
    testAfc('alt', '.secondary');
    
    // Take screenshot after test completion
    cy.takePageScreenshot('math_after_test');
  });
});
