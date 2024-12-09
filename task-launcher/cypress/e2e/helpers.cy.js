// clicks 'OK' button until instructions are complete
export function clickThroughInstructions(){
  // if footer is present, the task has ended
  cy.get('.lev-stimulus-container').then((content) => {
    if (content.find('footer').length === 1){
      return; 
    } else {
      // otherwise check for OK button, indicating instruction phase
      cy.get('.jspsych-content').then((content) => {
        const okButton = content.find('.primary');
        if (okButton.length > 0) {
          cy.contains('OK').click({timeout: 60000}); 
          clickThroughInstructions();
        } else {
          return; 
        }
      })
      return; 
    }
  });  
}

// clicks first image option until game is over
function selectAnswers(correctFlag, buttonClass){
  handleMathSlider();
  clickThroughInstructions(); 

  // wait for fixation cross to go away 
  cy.get('.lev-stimulus-container', {timeout: 60000}).should('exist'); 

  cy.get('.jspsych-content').then((content) => {
    const responseButtons = content.find(buttonClass); 
    
    if (responseButtons.length > 1){ 
      if (correctFlag === 'alt') { 
        cy.get('[aria-label="correct"]').click({timeout: 30000}); // add timeout to handle staggered buttons
      } else { // use correct class by default 
        cy.get('.correct').click({timeout: 30000}); // add timeout to handle staggered buttons
      }

      selectAnswers(correctFlag, buttonClass);  

    } else {
      cy.contains('Thank you!').should('exist');
      return; 
    }
  });
}

function handleMathSlider() {
  cy.wait(300);
// wait for fixation cross to go away
  cy.get('.lev-stimulus-container', {timeout: 60000}).should('exist');

  cy.get('.jspsych-content').then((content) => {
    const slider = content.find('.jspsych-slider');
    const responseButtons = content.find('.secondary'); // should be length zero if in the movable slider phase

    if (slider.length && !responseButtons.length) {
      cy.get('.jspsych-slider').realClick(); 

      cy.get('.primary').then((continueButton) => {
        continueButton.click(); 
        handleMathSlider();
      })
    } 
  })

  return; 
}

export function testAfc(correctFlag, buttonClass){
    // wait for OK button to be visible
    cy.contains('OK', {timeout: 600000}).should('be.visible'); 
    cy.contains('OK').realClick(); // real click mimics user gesture so that fullscreen can start
    selectAnswers(correctFlag, buttonClass);
    cy.contains('Exit').click(); 
}