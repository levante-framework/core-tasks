const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('Memory Game Final Screenshots', () => {
  let screenshotCounter = 1;

  // Handle fullscreen permission errors
  Cypress.on('uncaught:exception', (err, runnable) => {
    // Ignore fullscreen permission errors
    if (err.message.includes('Permissions check failed') || 
        err.message.includes('fullscreen') ||
        err.message.includes('enterFullScreen')) {
      return false;
    }
    // Let other errors fail the test
    return true;
  });

  function takeScreenshot(description) {
    cy.screenshot(`${screenshotCounter.toString().padStart(3, '0')}-${description}`);
    screenshotCounter++;
  }

  it('captures memory game screenshots with error handling', () => {
    cy.visit(memory_game_url);
    takeScreenshot('initial-load');

    // wait for OK button to appear
    cy.contains('OK', { timeout: 300000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    // Try to click OK, but handle fullscreen errors gracefully
    cy.contains('OK').click({ force: true });
    takeScreenshot('after-ok-click');

    // Wait a bit for any transitions
    cy.wait(3000);
    takeScreenshot('after-wait');

    cy.get('p').then(() => {
      memoryLoop();
    });

    // Try to find exit button, but don't fail if it's not there
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Exit")').length > 0) {
        takeScreenshot('before-exit');
        cy.contains('Exit').click();
        takeScreenshot('final-exit');
      } else {
        takeScreenshot('no-exit-button-found');
      }
    });
  });

  function handleInstructions() {
    takeScreenshot('instructions-screen');
    
    cy.get('.jspsych-content').then((content) => {
      const corsiBlocks = content.find('.jspsych-corsi-block');

      if (corsiBlocks.length === 0) {
        // Look for any button that might advance the instructions
        cy.get('body').then(($body) => {
          if ($body.find('button:contains("OK")').length > 0) {
            cy.contains('OK').click();
            takeScreenshot('after-instructions-ok');
          } else if ($body.find('button').length > 0) {
            cy.get('button').first().click();
            takeScreenshot('after-instructions-button');
          }
        });
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
            cy.wait(500); // Small delay between clicks
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
        // Limit the number of loops to prevent infinite recursion
        if (screenshotCounter < 50) {
          memoryLoop();
        } else {
          takeScreenshot('max-screenshots-reached');
        }
      }
    });
  }
}); 