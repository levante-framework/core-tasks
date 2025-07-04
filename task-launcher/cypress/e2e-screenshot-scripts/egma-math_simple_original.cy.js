import { testAfc } from '../e2e/helpers.cy.js';

const math_url = 'http://localhost:8080/?task=egma-math';

describe('egma-math Simple Original with Screenshots', () => {
  let screenshotCounter = 0;

  // Override the testAfc function to add screenshots
  function testAfcWithScreenshots(correctFlag, buttonClass) {
    let taskCompleted = false;
    
    function takeScreenshot(label = '') {
      screenshotCounter++;
      const filename = `egma-math_simple_${screenshotCounter.toString().padStart(3, '0')}_${label}`;
      cy.screenshot(filename, { 
        capture: 'viewport',
        overwrite: true 
      });
    }

    // Instructions function with screenshots
    function instructions() {
      cy.get('.jspsych-content').then((content) => {
        const okButton = content.find('.primary');

        if (okButton.length > 0) {
          cy.get('.lev-stimulus-container').then((content) => {
            if (content.find('footer').length === 1) {
              takeScreenshot('exit_found');
              cy.contains('Exit').click({ timeout: 60000 });
              taskCompleted = true;
              return;
            } else {
              takeScreenshot('primary_button');
              cy.get('.primary').click({ timeout: 60000 });
              instructions();
            }
          });
        }
      });
    }

    // Select answers function with screenshots
    function selectAnswers(correctFlag, buttonClass) {
      cy.get('.jspsych-content').then((content) => {
        const responseButtons = content.find(buttonClass);

        if (responseButtons.length > 1) {
          if (correctFlag === 'alt') {
            takeScreenshot('correct_answer_aria');
            cy.get('[aria-label="correct"]')
              .should('be.visible')
              .and('not.be.disabled')
              .click({ force: true, timeout: 30000 });
          } else {
            takeScreenshot('correct_answer_class');
            cy.get('.correct').click({ timeout: 60000 });
          }
        }
      });
    }

    // Handle math slider with screenshots
    function handleMathSlider() {
      cy.get('.jspsych-content').then((content) => {
        const slider = content.find('.jspsych-slider');
        const responseButtons = content.find('.secondary');

        if (slider.length && !responseButtons.length) {
          takeScreenshot('math_slider');
          cy.get('.jspsych-slider').realClick();

          cy.get('.primary').then((continueButton) => {
            continueButton.click();
          });
        }
      });
    }

    // Task loop with screenshots
    function taskLoop(correctFlag, buttonClass) {
      if (taskCompleted || screenshotCounter >= 100) {
        return;
      }

      takeScreenshot('before_stimulus');
      
      cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');

      takeScreenshot('stimulus_exists');

      handleMathSlider();
      selectAnswers(correctFlag, buttonClass);
      instructions();

      cy.get('.lev-stimulus-container', { timeout: 60000 })
        .should('not.exist')
        .then(() => {
          if (!taskCompleted && screenshotCounter < 100) {
            taskLoop(correctFlag, buttonClass);
          }
        });
    }

    // Start the test
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    takeScreenshot('initial_ok');
    cy.contains('OK').realClick();
    takeScreenshot('after_ok_click');
    taskLoop(correctFlag, buttonClass);
  }

  it('visits math and plays game with screenshots', () => {
    cy.visit(math_url);
    testAfcWithScreenshots('alt', '.secondary');
  });
}); 