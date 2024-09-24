import {testImageAfc} from './helpers.cy.js'

const matrix_reasoning_url = 'http://localhost:8080/?task=matrix-reasoning'

describe('test matrix reasoning', () => {
  it('visits matrix reasoning and plays game', () => {
    cy.visit(matrix_reasoning_url);
    testImageAfc(true, '.image', 4);
  })
})