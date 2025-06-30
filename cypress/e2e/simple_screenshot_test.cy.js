const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('simple screenshot test', () => {
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    return false;
  });

  it('takes screenshots at key moments', () => {
    cy.visit(memory_game_url);
    cy.screenshot('01_initial_page');
    
    cy.contains('OK', { timeout: 30000 }).should('be.visible');
    cy.screenshot('02_ok_button_visible');
    
    cy.contains('OK').click({ force: true });
    cy.screenshot('03_after_ok_click');
    
    cy.wait(3000);
    cy.screenshot('04_after_wait');
    
    // Take a few more screenshots as the game progresses
    for (let i = 0; i < 5; i++) {
      cy.wait(2000);
      cy.screenshot(`05_game_progress_${i + 1}`);
      
      // Try to interact if there are blocks visible
      cy.get('body').then(($body) => {
        const blocks = $body.find('.jspsych-corsi-block');
        if (blocks.length > 0) {
          cy.wrap(blocks[0]).click({ force: true });
        }
        
        // Click OK if available
        const okButtons = $body.find('button:contains("OK")');
        if (okButtons.length > 0) {
          cy.wrap(okButtons[0]).click({ force: true });
        }
      });
    }
    
    cy.screenshot('06_final_screenshot');
  });
}); 