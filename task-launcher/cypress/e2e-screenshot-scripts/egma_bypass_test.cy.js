describe('EGMA Bypass Test', () => {
  let counter = 0;

  function takeScreenshot(label) {
    counter++;
    cy.screenshot(`egma_bypass_${counter.toString().padStart(3, '0')}_${label}`);
  }

  it('should test EGMA with bypass parameters', () => {
    cy.visit('http://localhost:8080/?task=egma-math&skip=true');
    takeScreenshot('loaded');
    
    cy.wait(5000);
    takeScreenshot('waited');
    
    // Try to click any buttons that appear
    cy.get('body').then(($body) => {
      if ($body.find('button').length > 0) {
        cy.get('button').first().click();
        takeScreenshot('clicked_button');
      }
    });
  });
}); 