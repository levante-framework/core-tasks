import { testAfc } from './helpers.cy.js';

const mental_rotation_url = 'http://localhost:8080/?task=mental-rotation';

describe('test mental rotation', () => {
  it('visits mental rotation and plays game', () => {
    cy.visit(mental_rotation_url);
    
    // Take screenshot of initial mental rotation page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('mental_rotation_initial_page');
    
    testAfc('class', '.image-large');
    
    // Take screenshot after test completion
    cy.takePageScreenshot('mental_rotation_after_test');
  });
});
