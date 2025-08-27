import { testAfc } from './helpers.cy.js';

const PORT = Cypress.env('DEV_PORT') || 8083;
const math_url = `http://localhost:${PORT}/?task=egma-math`;

describe('test math', () => {
  it('visits math and plays game', () => {
    cy.visit(math_url);
    testAfc('alt', '.secondary');
  });
});
