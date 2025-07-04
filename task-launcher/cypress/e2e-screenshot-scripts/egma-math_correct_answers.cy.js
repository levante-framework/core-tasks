describe('egma-math Correct Answers Test', () => {
  let screenshotCounter = 0;
  let taskCompleted = false;

  // Helper function to take screenshots
  function takeScreenshot(label = '') {
    screenshotCounter++;
    const filename = `egma-math_correct_${screenshotCounter.toString().padStart(3, '0')}_${label}`;
    cy.screenshot(filename, { 
      capture: 'viewport',
      overwrite: true 
    });
  }

  // Handle math slider (from original helpers.cy.js)
  function handleMathSlider() {
    cy.get('.jspsych-content').then((content) => {
      const slider = content.find('.jspsych-slider');
      const responseButtons = content.find('.secondary');

      if (slider.length && !responseButtons.length) {
        cy.get('.jspsych-slider').realClick();
        cy.get('.primary').then((continueButton) => {
          continueButton.click();
        });
      }
    });
  }

  // Select correct answers (from original helpers.cy.js)
  function selectAnswers() {
    cy.get('.jspsych-content').then((content) => {
      const responseButtons = content.find('.secondary');

      if (responseButtons.length > 1) {
        // Try aria-label="correct" first
        cy.get('body').then(($body) => {
          if ($body.find('[aria-label="correct"]').length > 0) {
            cy.get('[aria-label="correct"]')
              .should('be.visible')
              .and('not.be.disabled')
              .click({ force: true, timeout: 30000 });
          } else if ($body.find('.correct').length > 0) {
            cy.get('.correct').click({ timeout: 60000 });
          }
        });
      }
    });
  }

  // Handle instructions (from original helpers.cy.js)
  function instructions() {
    cy.get('.jspsych-content').then((content) => {
      const okButton = content.find('.primary');

      if (okButton.length > 0) {
        // Check for end of task
        cy.get('.lev-stimulus-container').then((content) => {
          if (content.find('footer').length === 1) {
            cy.contains('Exit').click({ timeout: 60000 });
            taskCompleted = true;
            return;
          } else {
            cy.get('.primary').click({ timeout: 60000 });
            instructions();
          }
        });
      }
    });
  }

  // Main task loop (adapted from original helpers.cy.js)
  function taskLoop() {
    if (taskCompleted) {
      return;
    }

    // Take screenshot before interaction
    takeScreenshot('before_interaction');

    // Wait for stimulus container
    cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');

    // Handle different interaction types
    handleMathSlider();
    selectAnswers();
    instructions();

    // Wait for transition and continue
    cy.get('.lev-stimulus-container', { timeout: 60000 })
      .should('not.exist')
      .then(() => {
        if (!taskCompleted) {
          // Small delay before next iteration
          cy.wait(1000);
          taskLoop();
        }
      });
  }

  it('should run EGMA math task with correct answers for 150+ screenshots', () => {
    // Mock fullscreen API
    cy.visit('http://localhost:8080/?task=egma-math', {
      onBeforeLoad(win) {
        // Mock fullscreen API
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

    // Wait for initial load and take first screenshot
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    takeScreenshot('initial_load');
    
    // Start the task with real click for fullscreen
    cy.contains('OK').realClick();
    
    // Run the task loop
    taskLoop();

    // Run for up to 10 minutes or until task completion
    cy.wait(600000, { timeout: 700000 }).then(() => {
      takeScreenshot('final_timeout');
    });
  });
}); 