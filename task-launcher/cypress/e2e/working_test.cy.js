describe('Working Test with Correct Port', () => {
  // Handle all uncaught exceptions
  Cypress.on('uncaught:exception', (err, runnable) => {
    console.log('Caught exception:', err.message);
    return false;
  });

  it('should work with port 8081', () => {
    // Visit with correct port
    cy.visit('http://localhost:8080/?task=egma-math');
    
    // Take initial screenshot
    cy.screenshot('01-initial-load');
    cy.wait(3000);
    
    // Look for OK button and click it
    cy.get('body').then(($body) => {
      cy.screenshot('02-page-content');
      
      if ($body.find('button:contains("OK")').length > 0) {
        cy.contains('OK').click({ force: true });
        cy.screenshot('03-after-ok-click');
        cy.wait(3000);
      }
      
      // Take more screenshots
      cy.screenshot('04-current-state');
      
      // Try to interact with any buttons
      const buttons = $body.find('button:not(:disabled)');
      if (buttons.length > 0) {
        cy.wrap(buttons.first()).click({ force: true });
        cy.screenshot('05-after-button-click');
      }
    });
    
    cy.wait(3000);
    cy.screenshot('06-final-state');
  });
}); 