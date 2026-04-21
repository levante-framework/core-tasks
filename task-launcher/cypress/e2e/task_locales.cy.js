const LOCALES = ['de-DE', 'es-CO', 'es-AR'];

const TASKS = [
  'intro',
  'egma-math',
  'matrix-reasoning',
  'mental-rotation',
  'hearts-and-flowers',
  'memory-game',
  'same-different-selection',
  'trog',
  'vocab',
  'theory-of-mind',
  'hostile-attribution',
  'child-survey',
];

function visitTaskWithLocaleAndEnterFullscreen(task, lng) {
  cy.visit(`http://localhost:8080/?task=${task}&lng=${lng}`);
  cy.get('button.primary').should('be.visible').first().realClick();
}

describe('tasks load in non-English locales (fullscreen only)', () => {
  TASKS.forEach((task) => {
    describe(task, () => {
      LOCALES.forEach((lng) => {
        it(`lng=${lng}`, () => {
          visitTaskWithLocaleAndEnterFullscreen(task, lng);
        });
      });
    });
  });
});
