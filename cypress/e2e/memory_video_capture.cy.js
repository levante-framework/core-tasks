const memory_game_url = 'http://localhost:8081/?task=memory-game';

describe('Memory Game Video Capture', () => {
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    return false;
  });

  it('records video of complete memory game session', () => {
    // Visit the memory game directly
    cy.visit(memory_game_url);

    // Wait for the page to load and check for any error messages
    cy.get('body').should('be.visible');
    
    // Check if we're on an error page
    cy.get('body').then(($body) => {
      const bodyText = $body.text().toLowerCase();
      if (bodyText.includes('error') || bodyText.includes('not found') || bodyText.includes('cannot')) {
        throw new Error('Page loaded with error content');
      }
    });

    // Wait for the memory game to initialize
    cy.contains('OK', { timeout: 30000 }).should('be.visible');
    
    // Start the memory game
    cy.contains('OK').click({ force: true });
    
    // Wait for game elements to appear
    cy.get('.jspsych-corsi-block', { timeout: 10000 }).should('have.length.greaterThan', 0);
    
    // Play through several rounds of the memory game
    for (let round = 0; round < 5; round++) {
      // Wait for sequence to play
      cy.wait(3000);
      
      // Click on blocks that are visible
      cy.get('.jspsych-corsi-block').then(($blocks) => {
        // Click on first few blocks in sequence
        for (let i = 0; i < Math.min(3, $blocks.length); i++) {
          cy.wrap($blocks[i]).click({ force: true });
          cy.wait(500);
        }
      });
      
      // Submit the sequence
      cy.get('body').then(($body) => {
        const submitBtn = $body.find('button:contains("Submit")');
        const okBtn = $body.find('button:contains("OK")');
        
        if (submitBtn.length > 0) {
          cy.wrap(submitBtn.first()).click({ force: true });
        } else if (okBtn.length > 0) {
          cy.wrap(okBtn.first()).click({ force: true });
        }
      });
      
      // Wait between rounds
      cy.wait(2000);
      
      // Check if the game is still running
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        if (bodyText.includes('Thank you') || bodyText.includes('Complete')) {
          return; // Game finished
        }
      });
    }
    
    // Let the game finish naturally
    cy.wait(5000);
  });
}); 