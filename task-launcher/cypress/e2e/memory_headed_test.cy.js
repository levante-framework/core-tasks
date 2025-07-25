const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Headed Test', () => {
  it('opens memory game in headed mode to see actual content', () => {
    cy.visit(memory_game_url);

    // Take a screenshot immediately
    cy.screenshot('headed-initial');

    // Wait and take another screenshot
    cy.wait(5000);
    cy.screenshot('headed-after-wait');

    // Look for any visible elements
    cy.get('body').then(($body) => {
      cy.log('Body HTML length:', $body.html().length);
      cy.log('Visible buttons:', $body.find('button:visible').length);
      cy.log('Visible divs:', $body.find('div:visible').length);
    });

    cy.screenshot('headed-final');
  });
});
