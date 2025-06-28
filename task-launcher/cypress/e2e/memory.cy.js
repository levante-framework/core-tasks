const memory_game_url = 'http://localhost:8080/?task=memory-game';
let memoryScreenshotCounter = 0;

// Helper function for memory test screenshots
function takeMemoryScreenshot(name) {
  if (Cypress.env('takeScreenshots')) {
    memoryScreenshotCounter++;
    const paddedCounter = memoryScreenshotCounter.toString().padStart(3, '0');
    cy.takePageScreenshot(`${paddedCounter}_memory_${name}`);
  }
}

describe('test memory game', () => {
  it('visits memory game and plays it', () => {
    cy.visit(memory_game_url);

    // Take screenshot of initial memory game page
    cy.wait(3000); // Wait for content to load
    takeMemoryScreenshot('initial_page');

    // wait for OK button to appear
    cy.contains('OK', { timeout: 300000 }).should('be.visible');
    
    // Take screenshot with OK button visible
    takeMemoryScreenshot('ok_button_visible');
    
    cy.contains('OK').realClick(); // start fullscreen

    // Take screenshot after starting fullscreen
    cy.wait(2000);
    takeMemoryScreenshot('after_fullscreen');

    cy.get('p').then(() => {
      memoryLoop();
    });

    // Take screenshot before exit
    takeMemoryScreenshot('before_exit');
    
    cy.contains('Exit').click();
    
    // Take screenshot after exit
    takeMemoryScreenshot('after_exit');
  });
});

function handleInstructions() {
  takeMemoryScreenshot('handle_instructions_start');
  
  cy.get('.jspsych-content').then((content) => {
    const corsiBlocks = content.find('.jspsych-corsi-block');

    if (corsiBlocks.length === 0) {
      takeMemoryScreenshot('handle_instructions_no_blocks_clicking_ok');
      cy.contains('OK').click();
      takeMemoryScreenshot('handle_instructions_ok_clicked');
    } else {
      takeMemoryScreenshot('handle_instructions_blocks_found');
    }
  });
  return;
}

function answerTrial() {
  takeMemoryScreenshot('answer_trial_start');
  
  // wait for gap after display phase
  cy.get('p', { timeout: 20000 }).should('not.exist');
  takeMemoryScreenshot('answer_trial_p_gone');
  
  cy.get('p').should('exist');
  takeMemoryScreenshot('answer_trial_p_exists');

  cy.get('.jspsych-content').then((content) => {
    const blocks = content.find('.jspsych-corsi-block');

    if (blocks.length > 0) {
      takeMemoryScreenshot('answer_trial_blocks_found');
      
      // wait for window to contain sequence information
      cy.window().its('cypressData').should('have.property', 'correctAnswer');
      takeMemoryScreenshot('answer_trial_cypress_data_ready');

      cy.window().then((window) => {
        const sequence = window.cypressData.correctAnswer;
        takeMemoryScreenshot('answer_trial_sequence_retrieved');
        
        sequence.forEach((number, index) => {
          blocks[number].click();
          takeMemoryScreenshot(`answer_trial_clicked_block_${index}_num_${number}`);
        });
        
        cy.get('p').should('not.exist', { timeout: 5000 });
        takeMemoryScreenshot('answer_trial_sequence_complete');
      });
    } else {
      takeMemoryScreenshot('answer_trial_no_blocks');
    }
  });
  return;
}

function memoryLoop() {
  takeMemoryScreenshot('memory_loop_start');
  
  cy.get('.jspsych-content').then((content) => {
    const corsiBlocks = content.find('.jspsych-corsi-block');

    if (corsiBlocks.length > 0) {
      takeMemoryScreenshot('memory_loop_corsi_blocks_found');
      answerTrial();
    } else {
      takeMemoryScreenshot('memory_loop_no_corsi_blocks_handling_instructions');
      handleInstructions();
    }
  });

  // end recursion if the task has reached the end screen
  cy.get('p,h1').then((p) => {
    if (p[0].textContent.includes('Thank you!')) {
      takeMemoryScreenshot('memory_loop_thank_you_found');
      return;
    } else {
      takeMemoryScreenshot('memory_loop_continuing');
      memoryLoop();
    }
  });
}
