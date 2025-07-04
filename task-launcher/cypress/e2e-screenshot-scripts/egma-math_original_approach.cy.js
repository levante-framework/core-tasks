// Based on the original math.cy.js and helpers.cy.js
// This version follows the exact same approach but adds screenshots

describe('egma-math Original Approach with Screenshots', () => {
  let screenshotCounter = 0;
  let maxScreenshots = 100;
  let taskCompleted = false;

  // Helper function to take screenshots
  function takeScreenshot(label = '') {
    screenshotCounter++;
    const filename = `egma-math_original_${screenshotCounter.toString().padStart(3, '0')}_${label}`;
    cy.screenshot(filename, { 
      capture: 'viewport',
      overwrite: true 
    });
  }

  // Recursively completes an instruction block (from helpers.cy.js)
  function instructions() {
    cy.get('.jspsych-content').then((content) => {
      const okButton = content.find('.primary');

      if (okButton.length > 0) {
        // Check for end of task
        cy.get('.lev-stimulus-container').then((content) => {
          if (content.find('footer').length === 1) {
            takeScreenshot('found_footer_exit');
            cy.contains('Exit').click({ timeout: 60000 });
            taskCompleted = true;
            return;
          } else {
            takeScreenshot('clicking_primary_instruction');
            cy.get('.primary').click({ timeout: 60000 });
            instructions();
          }
        });
      }
    });
  }

  // Clicks correct answers (from helpers.cy.js)
  function selectAnswers(correctFlag, buttonClass) {
    cy.get('.jspsych-content').then((content) => {
      const responseButtons = content.find(buttonClass);

      if (responseButtons.length > 1) {
        if (correctFlag === 'alt') {
          takeScreenshot('selecting_correct_aria_answer');
          cy.get('[aria-label="correct"]')
            .should('be.visible')
            .and('not.be.disabled')
            .click({ force: true, timeout: 30000 });
        } else {
          takeScreenshot('selecting_correct_class_answer');
          cy.get('.correct').click({ timeout: 60000 });
        }
      }
    });
  }

  // Handle math slider (from helpers.cy.js)
  function handleMathSlider() {
    cy.get('.jspsych-content').then((content) => {
      const slider = content.find('.jspsych-slider');
      const responseButtons = content.find('.secondary');

      if (slider.length && !responseButtons.length) {
        takeScreenshot('handling_math_slider');
        cy.get('.jspsych-slider').realClick();

        cy.get('.primary').then((continueButton) => {
          continueButton.click();
        });
      }
    });
  }

  // Main task loop (from helpers.cy.js)
  function taskLoop(correctFlag, buttonClass) {
    if (taskCompleted || screenshotCounter >= maxScreenshots) {
      return;
    }

    takeScreenshot('waiting_for_stimulus');
    
    // Wait for fixation cross to go away
    cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');

    takeScreenshot('stimulus_appeared');

    handleMathSlider();
    selectAnswers(correctFlag, buttonClass);
    instructions();

    cy.get('.lev-stimulus-container', { timeout: 60000 })
      .should('not.exist')
      .then(() => {
        if (!taskCompleted && screenshotCounter < maxScreenshots) {
          taskLoop(correctFlag, buttonClass);
        }
      });
  }

  // Main test function (from helpers.cy.js)
  function testAfc(correctFlag, buttonClass) {
    // Wait for OK button to be visible
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    takeScreenshot('initial_ok_button');
    
    // Real click mimics user gesture so that fullscreen can start
    cy.contains('OK').realClick();
    
    takeScreenshot('after_ok_click');
    
    taskLoop(correctFlag, buttonClass);
  }

  it('visits math and plays game with screenshots', () => {
    // Visit the same URL as original math.cy.js
    cy.visit('http://localhost:8080/?task=egma-math');
    
    takeScreenshot('page_loaded');
    
    // Use the same approach as original math.cy.js
    testAfc('alt', '.secondary');
    
    takeScreenshot('task_completed');
  });
}); 