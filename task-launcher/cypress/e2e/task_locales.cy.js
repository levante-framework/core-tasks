/* global cy, describe, expect, it, Cypress */

// Corpus from the registered prod pack for this task and locale.
function corpusForRegisteredPack(task, lng) {
  if (task === 'vocab') return `vocab-item-bank-${lng}`;
  if (task === 'theory-of-mind') return 'theory-of-mind-item-bank-cat-test';
  return '';
}

function visitTaskWithLocaleAndEnterFullscreen(task, lng) {
  const params = new URLSearchParams({ task, lng });
  const corpus = corpusForRegisteredPack(task, lng);
  if (corpus) params.set('corpus', corpus);
  cy.visit(`http://localhost:8080/?${params.toString()}`);
  cy.get('button.primary', { timeout: 120000 }).should('be.visible').first().realClick();
}

function groupLocalesByTask(matrix) {
  const byTask = {};
  matrix.forEach(({ locale, task }) => {
    if (!byTask[task]) {
      byTask[task] = [];
    }
    byTask[task].push(locale);
  });
  return byTask;
}

describe('tasks load per languageoptions.json (fullscreen only)', () => {
  const matrix = Cypress.env('languageLocaleTaskMatrix');

  if (!Array.isArray(matrix) || matrix.length === 0) {
    it('fails when languageLocaleTaskMatrix is not preloaded (see cypress.config.js)', () => {
      expect(matrix).to.be.an('array');
      expect(matrix).to.have.length.greaterThan(0);
    });
    return;
  }

  const byTask = groupLocalesByTask(matrix);

  Object.entries(byTask).forEach(([task, locales]) => {
    describe(task, () => {
      locales.forEach((lng) => {
        it(`lng=${lng}`, () => {
          visitTaskWithLocaleAndEnterFullscreen(task, lng);
        });
      });
    });
  });
});
