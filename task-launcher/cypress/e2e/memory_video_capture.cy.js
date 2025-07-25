const memory_game_url = 'http://localhost:8082/?task=memory-game';

describe('Memory Game Video Capture', () => {
  // Handle all uncaught exceptions to prevent test failure
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    return false;
  });

  it('records video of complete memory game session', () => {
    cy.visit(memory_game_url);

    // Wait for OK button to appear (same as working memory test)
    cy.contains('OK', { timeout: 300000 }).should('be.visible');
    cy.contains('OK').click({ force: true }); // start the game, force click to bypass webpack overlay

    // Wait for game to initialize
    cy.get('p').then(() => {
      // Play a few rounds of the memory game
      playMemoryRounds(3); // Play 3 rounds instead of the full game
    });

    // Exit the game
    cy.contains('Exit', { timeout: 30000 }).click({ force: true });
  });
});

function playMemoryRounds(maxRounds) {
  let roundCount = 0;

  function playRound() {
    if (roundCount >= maxRounds) {
      return; // Stop after max rounds
    }

    cy.get('.jspsych-content').then((content) => {
      const corsiBlocks = content.find('.jspsych-corsi-block');

      if (corsiBlocks.length === 0) {
        // Instructions screen
        cy.contains('OK').click({ force: true });
      } else {
        // Game screen - wait for sequence to play then respond
        cy.wait(3000); // Wait for sequence to finish

        // Click some blocks (not necessarily correct, just for demo)
        cy.wrap(corsiBlocks[0]).click({ force: true });
        if (corsiBlocks.length > 1) {
          cy.wait(500);
          cy.wrap(corsiBlocks[1]).click({ force: true });
        }

        roundCount++;
      }
    });

    // Check if game is still running
    cy.get('p,h1').then((elements) => {
      const text = elements.text();
      if (text.includes('Thank you!') || text.includes('Complete')) {
        return; // Game finished
      } else if (roundCount < maxRounds) {
        cy.wait(2000);
        playRound(); // Continue to next round
      }
    });
  }

  playRound();
}
