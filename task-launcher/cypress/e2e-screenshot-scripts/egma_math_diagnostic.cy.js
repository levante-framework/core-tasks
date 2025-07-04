describe('EGMA Math Diagnostic', () => {
  it('diagnoses what happens after clicking OK', () => {
    cy.visit('http://localhost:8080/?task=egma-math', {
      timeout: 60000
    });
    
    cy.screenshot('01-page-loaded');
    cy.wait(3000);
    
    // Check what's on the page initially
    cy.get('body').then(($body) => {
      cy.log('Initial page content:', $body.text());
    });
    
    // Look for OK button
    cy.contains('OK', { timeout: 60000 }).should('be.visible');
    cy.screenshot('02-ok-button-visible');
    
    // Click OK with real click
    cy.contains('OK').realClick();
    cy.screenshot('03-after-ok-click');
    cy.wait(5000);
    
    // Check what elements are present
    cy.get('body').then(($body) => {
      cy.log('After OK click - page content:', $body.text());
      cy.log('Looking for stimulus container...');
      
      // Check for various possible containers
      const containers = [
        '.lev-stimulus-container',
        '.jspsych-content',
        '.jspsych-display-element',
        '.stimulus-container',
        '.math-container'
      ];
      
      containers.forEach(selector => {
        const found = $body.find(selector);
        cy.log(`${selector}: found ${found.length} elements`);
      });
    });
    
    cy.screenshot('04-after-diagnosis');
    
    // Wait longer and check again
    cy.wait(10000);
    cy.screenshot('05-after-long-wait');
    
    // Check if stimulus container appears
    cy.get('body').then(($body) => {
      if ($body.find('.lev-stimulus-container').length > 0) {
        cy.log('✅ Stimulus container found!');
        cy.screenshot('06-stimulus-container-found');
      } else {
        cy.log('❌ Stimulus container still not found');
        cy.log('Current page HTML:', $body.html());
      }
    });
    
    // Try to find any clickable elements
    cy.get('body').then(($body) => {
      const buttons = $body.find('button');
      const clickables = $body.find('[role="button"], .clickable, .btn');
      
      cy.log(`Found ${buttons.length} buttons`);
      cy.log(`Found ${clickables.length} clickable elements`);
      
      if (buttons.length > 0) {
        cy.log('Button texts:', buttons.map((i, el) => el.textContent).get());
      }
    });
    
    cy.screenshot('07-final-diagnostic');
  });
}); 