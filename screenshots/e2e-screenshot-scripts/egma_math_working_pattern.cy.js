let taskCompleted = false;
let screenshotCounter = 0;

// Screenshot helper
function takeScreenshot(label) {
  const paddedCounter = String(screenshotCounter).padStart(3, '0');
  cy.screenshot(`${paddedCounter}-${label}`);
  screenshotCounter++;
}

// recursively completes an instruction block
function instructions() {
  cy.get('.jspsych-content').then((content) => {
    const okButton = content.find('.primary');

    if (okButton.length > 0) {
      // check for end of task
      cy.get('.lev-stimulus-container').then((content) => {
        if (content.find('footer').length === 1) {
          takeScreenshot('task-complete-exit');
          cy.contains('Exit').click({ timeout: 60000 });
          taskCompleted = true;
          return;
        } else {
          takeScreenshot('instruction-ok');
          cy.get('.primary').click({ timeout: 60000 });
          instructions();
        }
      });
    }
  });
}

// clicks correct answers
function selectAnswers(correctFlag, buttonClass) {
  cy.get('.jspsych-content').then((content) => {
    const responseButtons = content.find(buttonClass);

    if (responseButtons.length > 1) {
      takeScreenshot('before-answer-selection');
      if (correctFlag === 'alt') {
        cy.get('[aria-label="correct"]')
          .should('be.visible')
          .and('not.be.disabled')
          .click({ force: true, timeout: 30000 }); // add timeout to handle staggered buttons
        takeScreenshot('after-correct-answer');
      } else {
        // use correct class by default
        cy.get('.correct').click({ timeout: 60000 }); // add timeout to handle staggered buttons
        takeScreenshot('after-correct-class');
      }
    } else {
      return;
    }
  });
}

function handleMathSlider() {
  cy.get('.jspsych-content').then((content) => {
    const slider = content.find('.jspsych-slider');
    const responseButtons = content.find('.secondary'); // should be length zero if in the movable slider phase

    if (slider.length && !responseButtons.length) {
      takeScreenshot('math-slider-found');
      cy.get('.jspsych-slider').realClick();

      cy.get('.primary').then((continueButton) => {
        continueButton.click();
        takeScreenshot('after-slider-continue');
      });
    }
  });

  return;
}

function taskLoop(correctFlag, buttonClass) {
  // wait for fixation cross to go away
  cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');
  takeScreenshot('stimulus-container-exists');

  handleMathSlider();
  selectAnswers(correctFlag, buttonClass);
  instructions();

  cy.get('.lev-stimulus-container', { timeout: 60000 })
    .should('not.exist')
    .then(() => {
      takeScreenshot('stimulus-container-gone');
      if (taskCompleted) {
        takeScreenshot('task-fully-completed');
        return;
      } else {
        taskLoop(correctFlag, buttonClass);
      }
    });
}

function testAfcWithScreenshots(correctFlag, buttonClass) {
  // wait for OK button to be visible
  cy.contains('OK', { timeout: 600000 }).should('be.visible');
  takeScreenshot('initial-ok-button');
  cy.contains('OK').realClick(); // real click mimics user gesture so that fullscreen can start
  takeScreenshot('after-initial-ok');
  taskLoop(correctFlag, buttonClass);
}

describe('EGMA Math Working Pattern Screenshot Capture', () => {
  it('captures screenshots using exact working pattern from helpers.cy.js', () => {
    cy.visit('http://localhost:8080/?task=egma-math', {
      timeout: 60000
    });
    
    takeScreenshot('page-loaded');
    
    // Use the exact working pattern
    testAfcWithScreenshots('alt', '.secondary');
    
    cy.then(() => {
      cy.log(`✅ EGMA Math screenshot capture completed!`);
      cy.log(`📸 Total screenshots captured: ${screenshotCounter}`);
    });
  });
}); 