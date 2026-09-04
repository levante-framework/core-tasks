import { getParamLists, instructions } from './helpers.cy.js';

const task = 'intro';
const base_url = `http://localhost:8080/?task=${task}`;
const testUrls = getParamLists(task).map((params) => `${base_url}&${params}`);

describe('test intro', () => {
  if (testUrls.length === 0) {
    it('fails when no test URLs are available (see cypress.config.js)', () => {
      expect(testUrls).to.have.length.greaterThan(0);
    });
    return;
  }

  testUrls.forEach((url) => {
    const label = url.slice(base_url.length + 1) || 'default';

    it(`visits intro and clicks through instructions (${label})`, () => {
      cy.visit(url);
      cy.get('.jspsych-content', { timeout: 600000 }).find('.primary').should('be.visible');
      cy.get('.jspsych-content').find('.primary').realClick();
      instructions();
    });
  });
});
