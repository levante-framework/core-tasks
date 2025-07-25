const memory_game_url = 'http://localhost:8082/?task=memory-game';

describe('Memory Game Passive Video Capture', () => {
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    return false;
  });

  it('passively records memory game without any interactions', () => {
    cy.visit(memory_game_url);

    // Wait for the page to load completely
    cy.get('body').should('be.visible');

    // Wait a bit for any initial loading
    cy.wait(3000);

    // Just let the game run for 60 seconds without any interactions
    // This should capture whatever the game shows naturally
    cy.wait(60000);

    // The test ends here - we've captured 60 seconds of whatever the game displays
  });
});
