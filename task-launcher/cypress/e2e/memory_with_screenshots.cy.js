const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game with Screenshots', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('plays memory game and captures screenshots throughout', () => {
    cy.visit(memory_game_url);

    takeScreenshot('initial-load');

    // wait for OK button to appear
    cy.contains('OK', { timeout: 300000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').realClick(); // start fullscreen
    takeScreenshot('after-fullscreen-start');

    cy.get('p').then(() => {
      memoryLoop();
    });

    takeScreenshot('before-exit');
    cy.contains('Exit').click();
    takeScreenshot('final-exit');
  });

  function handleInstructions() {
    takeScreenshot('instructions-screen');
    
    cy.get('.jspsych-content').then((content) => {
      const corsiBlocks = content.find('.jspsych-corsi-block');

      if (corsiBlocks.length === 0) {
        cy.contains('OK').click();
        takeScreenshot('after-instructions-ok');
      }
    });
    return;
  }

  function answerTrial() {
    takeScreenshot('trial-start');
    
    // wait for gap after display phase
    cy.get('p', { timeout: 20000 }).should('not.exist');
    cy.get('p').should('exist');
    
    takeScreenshot('after-sequence-display');

    cy.get('.jspsych-content').then((content) => {
      const blocks = content.find('.jspsych-corsi-block');

      if (blocks.length > 0) {
        takeScreenshot('blocks-visible-for-input');
        
        // wait for window to contain sequence information
        cy.window().its('cypressData').should('have.property', 'correctAnswer');

        cy.window().then((window) => {
          const sequence = window.cypressData.correctAnswer;
          
          sequence.forEach((number, index) => {
            blocks[number].click();
            takeScreenshot(`clicking-block-${index + 1}-of-${sequence.length}`);
          });
          
          cy.get('p').should('not.exist', { timeout: 5000 });
          takeScreenshot('trial-completed');
        });
      }
    });
    return;
  }

  function memoryLoop() {
    cy.get('.jspsych-content').then((content) => {
      const corsiBlocks = content.find('.jspsych-corsi-block');

      if (corsiBlocks.length > 0) {
        answerTrial();
      } else {
        handleInstructions();
      }
    });

    // end recursion if the task has reached the end screen
    cy.get('p,h1').then((p) => {
      if (p[0].textContent.includes('Thank you!')) {
        takeScreenshot('thank-you-screen');
        return;
      } else {
        memoryLoop();
      }
    });
  }
}); 