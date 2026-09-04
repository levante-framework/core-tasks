/* global cy, describe, expect, it, Cypress */

function visitTaskWithLocaleAndEnterFullscreen(task, lng, params = []) {
  const paramString = params.length ? `&${params.join('&')}` : '';
  cy.visit(`http://localhost:8080/?task=${task}&lng=${lng}${paramString}`);
  cy.get('button.primary', { timeout: 120000 }).should('be.visible').first().realClick();
}

describe('tasks load per languageoptions.json (fullscreen only)', () => {
  const remainingLocalesPerVariant = Cypress.env('remainingLocalesPerVariant');

  if (
    !remainingLocalesPerVariant ||
    typeof remainingLocalesPerVariant !== 'object' ||
    Object.keys(remainingLocalesPerVariant).length === 0
  ) {
    it('fails when remainingLocalesPerVariant is not preloaded (see cypress.config.js)', () => {
      expect(remainingLocalesPerVariant).to.be.an('object');
      expect(Object.keys(remainingLocalesPerVariant)).to.have.length.greaterThan(0);
    });
    return;
  }

  Object.values(remainingLocalesPerVariant).forEach(({ task, params, locales }) => {
    const label = params.length ? `${task} [${params.join(', ')}]` : task;
    describe(label, () => {
      locales.forEach((lng) => {
        it(`lng=${lng}`, () => {
          visitTaskWithLocaleAndEnterFullscreen(task, lng, params);
        });
      });
    });
  });
});
