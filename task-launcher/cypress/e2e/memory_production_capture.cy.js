const memory_game_url = 'http://localhost:8082/?task=memory-game';

describe('Memory Game Production Video Capture', () => {
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    return false;
  });

  it('records clean video of memory game without webpack overlays', () => {
    cy.visit(memory_game_url);

    // Wait for the page to load completely
    cy.get('body').should('be.visible');
    
    // Wait for OK button to appear
    cy.contains('OK', { timeout: 30000 }).should('be.visible');
    cy.contains('OK').click({ force: true });

    // Wait for game to initialize
    cy.wait(5000);
    
    // Play a simplified version of the memory game
    for (let round = 0; round < 3; round++) {
      // Wait for any sequence to play
      cy.wait(3000);
      
      // Try to interact with the game
      cy.get('body').then(($body) => {
        const blocks = $body.find('.jspsych-corsi-block');
        if (blocks.length > 0) {
          // Click a few blocks
          cy.wrap(blocks[0]).click({ force: true });
          cy.wait(500);
          if (blocks.length > 1) {
            cy.wrap(blocks[1]).click({ force: true });
          }
        }
        
        // Try to find and click OK or Submit buttons
        const okBtn = $body.find('button:contains("OK")');
        const submitBtn = $body.find('button:contains("Submit")');
        
        if (submitBtn.length > 0) {
          cy.wrap(submitBtn.first()).click({ force: true });
        } else if (okBtn.length > 0) {
          cy.wrap(okBtn.first()).click({ force: true });
        }
      });
      
      cy.wait(2000);
    }
    
    // Let the game run a bit longer to capture more content
    cy.wait(10000);
    
    // Try to exit gracefully
    cy.get('body').then(($body) => {
      const exitBtn = $body.find('button:contains("Exit")');
      if (exitBtn.length > 0) {
        cy.wrap(exitBtn.first()).click({ force: true });
      }
    });
  });
}); 