import { testAfc } from './helpers.cy.js';

const matrix_reasoning_url = 'http://localhost:8080/?task=matrix-reasoning';

describe('test matrix reasoning', () => {
  it('visits matrix reasoning and plays game', () => {
    cy.visit(matrix_reasoning_url);
    
    // Take screenshot of initial matrix reasoning page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('matrix_reasoning_initial_page');
    
    testAfc('class', '.image');
    
    // Take screenshot after test completion
    cy.takePageScreenshot('matrix_reasoning_after_test');
  });
});
