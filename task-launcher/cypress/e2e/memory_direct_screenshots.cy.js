const memory_game_url = 'http://localhost:8082/?task=memory-game';

describe('Memory Game Direct Screenshots', () => {
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    return false;
  });

  it('takes direct screenshots of memory game at intervals', () => {
    cy.visit(memory_game_url);

    // Wait for the page to load completely
    cy.get('body').should('be.visible');
    
    // Take initial screenshot
    cy.screenshot('01-initial-load');
    cy.wait(2000);
    
    // Look for and click OK button if it exists
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("OK")').length > 0) {
        cy.contains('OK').click({ force: true });
        cy.screenshot('02-after-ok-click');
        cy.wait(2000);
      }
    });
    
    // Take screenshots every 3 seconds for the next 30 seconds
    for (let i = 3; i <= 12; i++) {
      cy.wait(3000);
      cy.screenshot(`${i.toString().padStart(2, '0')}-game-progress`);
    }
    
    // Take a final screenshot
    cy.wait(5000);
    cy.screenshot('13-final-state');
  });
}); 