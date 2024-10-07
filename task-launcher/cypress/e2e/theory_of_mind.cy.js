import {testAfc} from './helpers.cy.js'

const TOM_url = 'http://localhost:8080/?task=theory-of-mind'

describe('test theory of mind', () => {
  it('visits theory of mind and plays game', () => {
    cy.visit(TOM_url, '.image');
    testAfc();
  })
})