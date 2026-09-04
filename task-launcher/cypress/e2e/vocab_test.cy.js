import { getParamLists, testAfc } from './helpers.cy.js';

const task = 'vocab';
const base_url = `http://localhost:8080/?task=${task}`;
const testUrls = getParamLists(task).map((params) => `${base_url}&${params}`);

describe('test vocab', () => {
  if (testUrls.length === 0) {
    it('fails when no test URLs are available (see cypress.config.js)', () => {
      expect(testUrls).to.have.length.greaterThan(0);
    });
    return;
  }

  testUrls.forEach((url) => {
    const label = url.slice(base_url.length + 1) || 'default';

    it(`visits vocab and plays game (${label})`, () => {
      cy.visit(url);
      testAfc('class', '.image-medium');
    });
  });
});
