import {testAfc} from './helpers.cy.js'

const vocab_url = 'http://localhost:8080/?task=vocab'

describe('test vocab', () => {
  it('visits vocab and plays game', () => {
    cy.visit(vocab_url);
    testAfc();
  })
})