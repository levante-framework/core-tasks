describe('egma-math Fixed Flow Test', () => {
  let screenshotCounter = 0;
  let maxScreenshots = 50;
  let taskCompleted = false;

  // Helper function to take screenshots
  function takeScreenshot(label = '') {
    screenshotCounter++;
    const filename = `egma-math_fixed_${screenshotCounter.toString().padStart(3, '0')}_${label}`;
    cy.screenshot(filename, { 
      capture: 'viewport',
      overwrite: true 
    });
    cy.log(`Screenshot ${screenshotCounter}: ${label}`);
  }

  // Handle instructions (from original helpers.cy.js)
  function instructions() {
    cy.get('.jspsych-content').then((content) => {
      const okButton = content.find('.primary');

      if (okButton.length > 0) {
        // Check for end of task
        cy.get('.lev-stimulus-container').then((content) => {
          if (content.find('footer').length === 1) {
            cy.log('Found footer, clicking Exit');
            cy.contains('Exit').click({ timeout: 60000 });
            taskCompleted = true;
            return;
          } else {
            cy.log('Found primary button, clicking it');
            cy.get('.primary').click({ timeout: 60000 });
            instructions();
          }
        });
      }
    });
  }

  // Select correct answers (from original helpers.cy.js)
  function selectAnswers(correctFlag, buttonClass) {
    cy.get('.jspsych-content').then((content) => {
      const responseButtons = content.find(buttonClass);

      if (responseButtons.length > 1) {
        if (correctFlag === 'alt') {
          cy.log('Clicking correct answer with aria-label');
          cy.get('[aria-label="correct"]')
            .should('be.visible')
            .and('not.be.disabled')
            .click({ force: true, timeout: 30000 });
        } else {
          cy.log('Clicking correct answer with class');
          cy.get('.correct').click({ timeout: 60000 });
        }
      }
    });
  }

  // Handle math slider (from original helpers.cy.js)
  function handleMathSlider() {
    cy.get('.jspsych-content').then((content) => {
      const slider = content.find('.jspsych-slider');
      const responseButtons = content.find('.secondary');

      if (slider.length && !responseButtons.length) {
        cy.log('Found slider, clicking it');
        cy.get('.jspsych-slider').realClick();

        cy.get('.primary').then((continueButton) => {
          cy.log('Clicking continue button after slider');
          continueButton.click();
        });
      }
    });
  }

  // Main task loop (exact copy from original helpers.cy.js)
  function taskLoop(correctFlag, buttonClass) {
    if (taskCompleted || screenshotCounter >= maxScreenshots) {
      cy.log('Task completed or max screenshots reached');
      return;
    }

    // Take screenshot before waiting for stimulus
    takeScreenshot('before_stimulus_wait');

    // Wait for fixation cross to go away - CRITICAL STEP
    cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');

    // Take screenshot after stimulus appears
    takeScreenshot('after_stimulus_appears');

    // Handle interactions
    handleMathSlider();
    selectAnswers(correctFlag, buttonClass);
    instructions();

    // CRITICAL: Wait for stimulus container to NOT exist before continuing
    cy.get('.lev-stimulus-container', { timeout: 60000 })
      .should('not.exist')
      .then(() => {
        cy.log('Stimulus container disappeared, continuing to next iteration');
        if (!taskCompleted && screenshotCounter < maxScreenshots) {
          taskLoop(correctFlag, buttonClass);
        }
      });
  }

  it('should run EGMA math task with correct flow for 50 screenshots', () => {
    // Mock fullscreen API
    cy.visit('http://localhost:8080/?task=egma-math', {
      onBeforeLoad(win) {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          value: win.document.documentElement,
          writable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          value: true,
          writable: true
        });
      }
    });

    // Wait for initial load
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    takeScreenshot('initial_load');
    
    // Start the task with realClick (from original helpers.cy.js)
    cy.log('Starting task with realClick');
    cy.contains('OK').realClick();
    
    // Start the task loop with original parameters
    taskLoop('alt', '.secondary');
  });
}); 