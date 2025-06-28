const local_url = 'http://localhost:8080';

describe('home page', () => {
  it('visits the home page', () => {
    cy.visit(local_url);
    
    // Wait for the page to actually load content
    // The app is JavaScript-heavy, so we need to wait for it to render
    cy.get('body').should('exist');
    
    // Wait for some content to appear (even if it's an error or loading state)
    cy.get('body').should('not.be.empty');
    
    // Wait a bit more for any async content
    cy.wait(2000);
    
    // Take a manual screenshot to see what we actually get
    cy.takePageScreenshot('manual_home_page');
  });
});
