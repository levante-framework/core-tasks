import { testAfc } from './helpers.cy.js';

const mental_rotation_url = 'http://localhost:8080/?task=mental-rotation';

describe('test mental rotation', () => {
  it('visits mental rotation and plays game', () => {
    cy.visit(mental_rotation_url);
    testAfc('class', '.image-large');
  });
});
