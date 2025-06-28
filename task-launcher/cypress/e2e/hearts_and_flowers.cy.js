import { testAfc } from './helpers.cy.js';

const hearts_and_flowers_url = 'http://localhost:8080/?task=hearts-and-flowers';

// keep track of game phase (true means it has started)
var heart_phase = false;
var flower_phase = false;
var mixed_practice = false;
var final_instructions = false; // instructions before final mixed test phase
var mixed_test = false;

describe('test hearts and flowers', () => {
  it('visits hearts and flowers and plays game', () => {
    cy.visit(hearts_and_flowers_url);
    
    // Take screenshot of initial hearts and flowers page
    cy.wait(3000); // Wait for content to load
    cy.takePageScreenshot('hearts_and_flowers_initial_page');
    
    testAfc('alt', '.secondary');
    
    // Take screenshot after test completion
    cy.takePageScreenshot('hearts_and_flowers_after_test');

    // wait for OK button to appear
    cy.contains('OK', { timeout: 300000 }).should('be.visible');
    cy.contains('OK').realClick(); // start fullscreen

    hafLoop();
  });
});

function hafLoop() {
  // end if the there are no elements inside jspsych content
  cy.get('.jspsych-content').then((content) => {
    if (content.children().length) {
      const okButton = content.find('.primary');
      // Make the decision here to handle instructions or pick an answer
      if (okButton.length) {
        handleInstructions();
      } else {
        pickAnswer();
      }
      cy.wait(1000); // wait for screen to render
      hafLoop();
    } else {
      // make sure that the game has progressed through major phases before passing
      assert.isTrue(heart_phase && flower_phase && mixed_test);
    }
  });
}

function handleInstructions() {
  cy.get('.jspsych-content').then((content) => {
    const okButton = content.find('.primary');

    if (okButton.length) {
      cy.contains('OK').click();

      final_instructions = mixed_practice;
    }
  });

  return;
}

function pickAnswer() {
  // wait for feedback screen to end
  cy.get('.haf-stimulus-holder').should('exist');

  cy.get('.jspsych-content').then((content) => {
    const stimContainer = content.find('.haf-stimulus-container');

    if (stimContainer.length) {
      // check for presence of stimulus on left side
      const leftStim = stimContainer.find('.stimulus-left');

      // get position of stimulus based on whether leftStim exists
      const pos = leftStim.length ? 0 : 1;

      // get stimulus image itself and then click button based on src and pos
      const stim = cy.get('[alt="heart or flower"]');
      stim.invoke('attr', 'src').then((src) => {
        // click the correct button
        cy.get('.secondary--green').eq(getCorrectButtonIdx(src, pos)).click();
      });
    }
  });

  return;
}

// uses image src and image position to get the right button index
function getCorrectButtonIdx(src, pos) {
  const shape = src.split('/').pop();

  if (shape === 'heart.png') {
    heart_phase = true;
    mixed_practice = flower_phase;
    mixed_test = final_instructions;

    return pos;
  } else if (shape === 'flower.png') {
    flower_phase = true;

    if (pos === 1) {
      return 0;
    } else if (pos === 0) {
      return 1;
    }
  }
}
