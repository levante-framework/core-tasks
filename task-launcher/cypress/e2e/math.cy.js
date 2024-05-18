describe('Test loading of assets in egma-math task', () => {
  it('egma-math asset loading test', () => {
    cy.testEGMAmath(startText, endText);
  });
});
