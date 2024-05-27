const local_url = 'http://localhost:8080';

describe('home page', () => {
  it('visits the home page', () => {
    cy.visit(local_url)
  })
})