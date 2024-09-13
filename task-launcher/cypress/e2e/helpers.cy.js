// clicks 'OK' button until instructions are complete
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

// clicks first image option until game is over
function selectImages(){
    // first wait for fixation cross to go away 
    cy.wait(500);
    cy.get('.jspsych-content').then((content) => {
      if (content.find('.jspsych-audio-multi-response-button').length === 4){ // should be 4 buttons on screen
        cy.get('.image').eq(0).click();
        selectImages();  
      } else {
        cy.contains('Thank you!').should('exist');
        return; 
      }
    });
  }

export function testImageAfc(){
    // wait for OK button to be visible
    cy.contains('OK', {timeout: 120000}).should('be.visible'); 
    cy.contains('OK').realClick(); // real click mimics user gesture so that fullscreen can start
    clickThroughInstructions(); 
    selectImages();
}