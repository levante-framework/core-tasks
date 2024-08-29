const local_url = 'http://localhost:8080/?task=vocab'

describe('test vocab', () => {

  function clickThroughInstructions(){
    cy.get('.jspsych-audio-multi-response-button').then((buttonWrapper) => {
      if (buttonWrapper.find('.primary').length > 0){
        cy.contains('OK').click();
        clickThroughInstructions(); 
      } else {
        return; 
      }
    });
  }

  function playGame(){
    // first wait for fixation cross to go away 
    cy.wait(500);
    cy.get('.jspsych-content').then((content) => {
      if (content.find('.jspsych-audio-multi-response-button').length > 0){
        cy.get('.image').eq(0).click();
        playGame();  
      } else {
        cy.contains('Thank you!').should('exist');
        return; 
      }
    });
  }

  it('visits trog and plays game', () => {
    cy.visit(local_url)
    // wait for OK button to be visible
    cy.contains('OK', {timeout: 60000}).should('be.visible'); 
    cy.contains('OK').click();
    clickThroughInstructions(); 
    playGame(); 
  })
})