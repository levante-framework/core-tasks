import {testImageAfc} from './helpers.cy.js'

const trog_url = 'http://localhost:8080/?task=trog'

describe('test trog', () => {
  it('visits trog and plays game', () => {
    cy.visit(trog_url);
    testImageAfc(true, '.image-medium');
  })
})