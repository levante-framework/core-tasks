const local_url = 'http://localhost:8080/?task=vocab'

describe('practice spec', () => {

  function clickThroughInstructions(content){
    if (content.then(($content) => {$content.find('.primary')}). length > 0){
      cy.contains('OK').click();
      clickThroughInstructions(); 
    } else {
      return; 
    }
  }

  it('visits vocab and plays game', () => {
    cy.visit(local_url)

    const content = cy.get('.jspsych-content', {timeout: 60000})

    clickThroughInstructions(content); 

    

    
    
    //console.log(cy.get('.jspsych-content').find('.primary', {timeout: 60000}).length > 0);

  

    //while (cy.get('.jspsych-content').find('.lev-response-row').length > 0){
    //  cy.get('.image')[0].click() 
    //}
  })
})