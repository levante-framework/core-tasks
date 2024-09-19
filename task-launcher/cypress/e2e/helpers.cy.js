// clicks 'OK' button until instructions are complete
function clickThroughInstructions(){
    cy.get('.jspsych-audio-multi-response-button').then((buttonWrapper) => {
      if (buttonWrapper.find('.primary').length > 0){
          cy.contains('OK').click({timeout: 15000}); 
          clickThroughInstructions(); 
      } else {
        return; 
      }
    });
  }

// clicks first image option until game is over
function selectImages(correct, imgClass, numberOfButtons){
    // first wait for fixation cross to go away 
    cy.wait(500);
    cy.get('.jspsych-content').then((content) => {
      if (content.find('.jspsych-audio-multi-response-button').length === numberOfButtons){ 
        if (correct){ 
          cy.get(imgClass).each((button) => {
            const image = button.find('img')[0]; 
            if ((image.alt).includes('correct')){
              button.click(); 
            } 
          })
        } else {
          cy.get(imgClass).eq(0).click();
        }
        selectImages(correct, imgClass, numberOfButtons);  
      } else {
        cy.contains('Thank you!').should('exist');
        return; 
      }
    });
  }

export function testImageAfc(correct, imgClass, numberOfButtons){
    // wait for OK button to be visible
    cy.contains('OK', {timeout: 120000}).should('be.visible'); 
    cy.contains('OK').realClick(); // real click mimics user gesture so that fullscreen can start
    clickThroughInstructions(); 
    selectImages(correct, imgClass, numberOfButtons);
    cy.contains('Exit').click(); 
}