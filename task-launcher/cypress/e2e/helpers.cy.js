let taskCompleted = false;
let screenshotCounter = 0;

// Helper function to take screenshots with counter
function takeScreenshotWithCounter(name) {
  if (Cypress.env('takeScreenshots')) {
    screenshotCounter++;
    const paddedCounter = screenshotCounter.toString().padStart(3, '0');
    cy.takePageScreenshot(`${paddedCounter}_${name}`);
  }
}

// Helper to take multiple screenshots with delays to catch content changes
function captureContentFrames(baseName, count = 3) {
  if (Cypress.env('takeScreenshots')) {
    for (let i = 1; i <= count; i++) {
      cy.wait(2000); // Wait longer between frames
      takeScreenshotWithCounter(`${baseName}_frame_${i}`);
    }
  }
}



// recursively completes an instruction block
export function instructions() {
  takeScreenshotWithCounter('instructions_entry');
  
  // Take screenshots to see what content is actually present
  captureContentFrames('instructions_content_check', 2);
  
  cy.get('.jspsych-content').then((content) => {
    takeScreenshotWithCounter('instructions_jspsych_content_found');
    
    const okButton = content.find('.primary');

    if (okButton.length > 0) {
      takeScreenshotWithCounter('instructions_primary_button_found');
      
      // check for end of task
      cy.get('.lev-stimulus-container').then((content) => {
        takeScreenshotWithCounter('instructions_stimulus_container_checked');
        
        if (content.find('footer').length === 1) {
          takeScreenshotWithCounter('instructions_footer_found_task_ending');
          if (Cypress.env('takeScreenshots')) {
            cy.contains('Exit').clickWithScreenshots({ timeout: 60000 });
          } else {
            cy.contains('Exit').click({ timeout: 60000 });
          }
          taskCompleted = true;
          captureContentFrames('instructions_exit_process', 2);
          return;
        } else {
          takeScreenshotWithCounter('instructions_no_footer_continuing');
          if (Cypress.env('takeScreenshots')) {
            cy.get('.primary').clickWithScreenshots({ timeout: 60000 });
          } else {
            cy.get('.primary').click({ timeout: 60000 });
          }
          // Capture frames after clicking to see content transition
          captureContentFrames('instructions_after_primary_click', 3);
          instructions();
        }
      });
    } else {
      takeScreenshotWithCounter('instructions_no_primary_button');
    }
  });
}

// clicks correct answers
function selectAnswers(correctFlag, buttonClass) {
  takeScreenshotWithCounter('select_answers_start');
  
  // Capture the current state before looking for buttons
  captureContentFrames('select_answers_current_state', 2);
  
  cy.get('.jspsych-content').then((content) => {
    takeScreenshotWithCounter('select_answers_jspsych_content_found');
    const responseButtons = content.find(buttonClass);

    if (responseButtons.length > 1) {
      takeScreenshotWithCounter('select_answers_multiple_buttons_found');
      
      if (correctFlag === 'alt') {
        takeScreenshotWithCounter('select_answers_looking_for_correct_aria_label');
        if (Cypress.env('takeScreenshots')) {
          cy.get('[aria-label="correct"]')
            .should('be.visible')
            .and('not.be.disabled')
            .clickWithScreenshots({ force: true, timeout: 30000 });
        } else {
          cy.get('[aria-label="correct"]')
            .should('be.visible')
            .and('not.be.disabled')
            .click({ force: true, timeout: 30000 });
        }
        // Capture frames after clicking to see response
        captureContentFrames('select_answers_aria_response', 3);
      } else {
        takeScreenshotWithCounter('select_answers_looking_for_correct_class');
        if (Cypress.env('takeScreenshots')) {
          cy.get('.correct').clickWithScreenshots({ timeout: 60000 });
        } else {
          cy.get('.correct').click({ timeout: 60000 });
        }
        // Capture frames after clicking to see response
        captureContentFrames('select_answers_class_response', 3);
      }
    } else {
      takeScreenshotWithCounter('select_answers_insufficient_buttons');
      return;
    }
  });
}

function handleMathSlider() {
  takeScreenshotWithCounter('math_slider_checking');
  
  cy.get('.jspsych-content').then((content) => {
    const slider = content.find('.jspsych-slider');
    const responseButtons = content.find('.secondary');

    if (slider.length && !responseButtons.length) {
      takeScreenshotWithCounter('math_slider_found_no_response_buttons');
      cy.get('.jspsych-slider').realClick();
      captureContentFrames('math_slider_after_click', 2);

      cy.get('.primary').then((continueButton) => {
        takeScreenshotWithCounter('math_slider_continue_button_found');
        if (Cypress.env('takeScreenshots')) {
          continueButton.clickWithScreenshots();
        } else {
          continueButton.click();
        }
        captureContentFrames('math_slider_after_continue', 3);
      });
    } else {
      takeScreenshotWithCounter('math_slider_not_applicable');
    }
  });

  return;
}

function taskLoop(correctFlag, buttonClass) {
  takeScreenshotWithCounter('task_loop_iteration_start');
  
  // wait for fixation cross to go away
  cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');
  takeScreenshotWithCounter('task_loop_stimulus_container_present');

  // Capture multiple frames to see the actual content that appears
  captureContentFrames('task_loop_content_frames', 4);

  handleMathSlider();
  selectAnswers(correctFlag, buttonClass);
  instructions();

  cy.get('.lev-stimulus-container', { timeout: 60000 })
    .should('not.exist')
    .then(() => {
      takeScreenshotWithCounter('task_loop_stimulus_container_gone');
      if (taskCompleted) {
        takeScreenshotWithCounter('task_loop_task_completed');
        return;
      } else {
        takeScreenshotWithCounter('task_loop_continuing_next_iteration');
        taskLoop(correctFlag, buttonClass);
      }
    });
}

export function testAfc(correctFlag, buttonClass) {
  takeScreenshotWithCounter('test_afc_starting');
  
  // Start continuous screenshot monitoring
  if (Cypress.env('takeScreenshots')) {
    cy.startContinuousScreenshots(2000); // Take screenshot every 2 seconds
  }
  
  // wait for OK button to be visible
  cy.contains('OK', { timeout: 600000 }).should('be.visible');
  takeScreenshotWithCounter('test_afc_ok_button_ready');
  
  if (Cypress.env('takeScreenshots')) {
    cy.contains('OK').realClickWithScreenshots(); // Use our custom command for screenshots
  } else {
    cy.contains('OK').realClick(); // Use normal realClick when screenshots disabled
  }
  
  takeScreenshotWithCounter('test_afc_fullscreen_initiated');
  
  // Let continuous screenshots capture the transition
  cy.wait(10000); // Wait 10 seconds for transition
  takeScreenshotWithCounter('test_afc_after_long_wait');
  
  // Capture multiple frames to catch the actual test content loading
  captureContentFrames('test_afc_fullscreen_content', 5);
  
  taskLoop(correctFlag, buttonClass);
  takeScreenshotWithCounter('test_afc_all_loops_completed');
  
  // Stop continuous screenshots
  if (Cypress.env('takeScreenshots')) {
    cy.stopContinuousScreenshots();
  }
}
