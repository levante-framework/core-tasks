// Based exactly on the original math.cy.js and helpers.cy.js
// Key changes: always click correct answers, add screenshots, no fullscreen mocking

describe('egma-math Correct Answers No Mock', () => {
  let screenshotCounter = 0;
  let maxScreenshots = 150;
  let taskCompleted = false;

  // Helper function to take screenshots
  function takeScreenshot(label = '') {
    if (screenshotCounter >= maxScreenshots) return;
    screenshotCounter++;
    const filename = `egma-math_correct_${screenshotCounter.toString().padStart(3, '0')}_${label}`;
    cy.screenshot(filename, { 
      capture: 'viewport',
      overwrite: true 
    });
  }

  // Recursively completes an instruction block (exact copy from helpers.cy.js)
  function instructions() {
    cy.get('.jspsych-content').then((content) => {
      const okButton = content.find('.primary');

      if (okButton.length > 0) {
        // Check for end of task
        cy.get('.lev-stimulus-container').then((content) => {
          if (content.find('footer').length === 1) {
            takeScreenshot('task_complete_exit');
            cy.contains('Exit').click({ timeout: 60000 });
            taskCompleted = true;
            return;
          } else {
            takeScreenshot('instruction_continue');
            cy.get('.primary').click({ timeout: 60000 });
            instructions();
          }
        });
      }
    });
  }

  // Clicks correct answers (exact copy from helpers.cy.js)
  function selectAnswers(correctFlag, buttonClass) {
    cy.get('.jspsych-content').then((content) => {
      const responseButtons = content.find(buttonClass);

      if (responseButtons.length > 1) {
        if (correctFlag === 'alt') {
          takeScreenshot('selecting_correct_aria');
          cy.get('[aria-label="correct"]')
            .should('be.visible')
            .and('not.be.disabled')
            .click({ force: true, timeout: 30000 });
        } else {
          takeScreenshot('selecting_correct_class');
          cy.get('.correct').click({ timeout: 60000 });
        }
      }
    });
  }

  // Handle math slider (exact copy from helpers.cy.js)
  function handleMathSlider() {
    cy.get('.jspsych-content').then((content) => {
      const slider = content.find('.jspsych-slider');
      const responseButtons = content.find('.secondary');

      if (slider.length && !responseButtons.length) {
        takeScreenshot('math_slider_interaction');
        cy.get('.jspsych-slider').realClick();

        cy.get('.primary').then((continueButton) => {
          continueButton.click();
        });
      }
    });
  }

  // Main task loop (exact copy from helpers.cy.js with screenshot limits)
  function taskLoop(correctFlag, buttonClass) {
    if (taskCompleted || screenshotCounter >= maxScreenshots) {
      return;
    }

    takeScreenshot('waiting_for_stimulus');
    
    // Wait for fixation cross to go away (CRITICAL TIMING)
    cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');

    takeScreenshot('stimulus_appeared');

    // Handle all interaction types
    handleMathSlider();
    selectAnswers(correctFlag, buttonClass);
    instructions();

    // CRITICAL: Wait for stimulus container to disappear before continuing
    cy.get('.lev-stimulus-container', { timeout: 60000 })
      .should('not.exist')
      .then(() => {
        if (!taskCompleted && screenshotCounter < maxScreenshots) {
          taskLoop(correctFlag, buttonClass);
        }
      });
  }

  // Main test function (exact copy from helpers.cy.js)
  function testAfc(correctFlag, buttonClass) {
    // Wait for OK button to be visible
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    takeScreenshot('initial_ok_button');
    
    // Real click mimics user gesture so that fullscreen can start (NO MOCKING!)
    cy.contains('OK').realClick();
    
    takeScreenshot('after_ok_realclick');
    
    // Start the main task loop
    taskLoop(correctFlag, buttonClass);
  }

  it('visits math and plays game with correct answers and screenshots', () => {
    // Use port 8080 where the server is now running
    cy.visit('http://localhost:8080/?task=egma-math');
    
    takeScreenshot('page_loaded');
    
    // Use exact same parameters as original math.cy.js
    testAfc('alt', '.secondary');
    
    takeScreenshot('final_complete');
  });
}); 