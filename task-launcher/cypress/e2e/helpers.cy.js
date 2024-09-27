// clicks 'OK' button until instructions are complete
function clickThroughInstructions(){
  // if footer is present, the task has ended
  cy.get('.lev-stimulus-container').then((content) => {
    if (content.find('footer').length === 1){
      return; 
    } else {
      // otherwise check for OK button, indicating instruction phase
      cy.get('.jspsych-audio-multi-response-button').then((buttonWrapper) => {
        if (buttonWrapper.find('.primary').length > 0){
          cy.contains('OK').click({timeout: 15000}); 
          clickThroughInstructions(); 
        } else {
          return; 
        }
      });
      }
  });  
}

function handlePracticeButtons(){
  cy.wait(500);
  cy.get('.jspsych-content').then((content) => {
    const practiceButtons = content.find('.practice-btn');
    if (practiceButtons.length > 0){
      cy.get('.practice-btn').each((button) => {
        button.click(); 
      })
      handlePracticeButtons();
    } else {
      return 
    }
  })
}

// clicks first image option until game is over
function selectImages(correct, imgClass){
  clickThroughInstructions(); 
  handlePracticeButtons(); 
  // wait for fixation cross to go away 
  cy.get('.lev-stimulus-container', {timeout: 10000}).should('exist'); 
  cy.get('.jspsych-content').then((content) => {
    if (content.find('.jspsych-audio-multi-response-button').length > 1){ 
      if (correct){  
        cy.get('.correct').click({timeout: 30000}); // add timeout to handle staggered buttons
      } else {
        cy.get(imgClass).eq(0).click({timeout: 30000});
      }
      selectImages(correct, imgClass);  
    } else {
      cy.contains('Thank you!').should('exist');
      return; 
    }
  });
}

export function testImageAfc(correct, imgClass){
    // wait for OK button to be visible
    cy.contains('OK', {timeout: 300000}).should('be.visible'); 
    cy.contains('OK').realClick(); // real click mimics user gesture so that fullscreen can start
    selectImages(correct, imgClass);
    cy.contains('Exit').click(); 
}