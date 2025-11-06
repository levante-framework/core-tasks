describe('TROG Helpers Pattern Capture', () => {
  let taskCompleted = false;
  let screenshotCounter = 0;
  let lastContentHash = '';

  const takeScreenshot = (label) => {
    const paddedCounter = String(screenshotCounter).padStart(3, '0');
    cy.screenshot(`${paddedCounter}-${label}`);
    screenshotCounter++;
  };

  const getContentHash = ($body) => {
    const visibleText = $body.find(':visible').text().trim();
    const visibleElements = $body.find(':visible').length;
    const buttons = $body.find('button:visible').length;
    const images = $body.find('img:visible').length;
    return `${visibleText.length}-${visibleElements}-${buttons}-${images}`;
  };

  // Modified instructions function with screenshot capture
  function instructions() {
    cy.get('.jspsych-content').then((content) => {
      const okButton = content.find('.primary');

      if (okButton.length > 0) {
        // Take screenshot before instruction interaction
        cy.get('body').then(($body) => {
          const currentHash = getContentHash($body);
          if (currentHash !== lastContentHash) {
            takeScreenshot('instruction-screen');
            lastContentHash = currentHash;
          }
        });

        // check for end of task
        cy.get('.lev-stimulus-container').then((content) => {
          if (content.find('footer').length === 1) {
            takeScreenshot('task-ending');
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

  // Modified selectAnswers function for TROG with screenshot capture
  function selectAnswers(correctFlag, buttonClass) {
    cy.get('.jspsych-content').then((content) => {
      const responseButtons = content.find(buttonClass);

      if (responseButtons.length > 1) {
        // Take screenshot before selecting answer
        cy.get('body').then(($body) => {
          const currentHash = getContentHash($body);
          if (currentHash !== lastContentHash) {
            takeScreenshot('answer-choices');
            lastContentHash = currentHash;
          }
        });

        if (correctFlag === 'alt') {
          // For TROG, look for .correct class on images first, then aria-label
          cy.get('body').then(($body) => {
            if ($body.find('img.correct').length > 0) {
              cy.log('✅ Found img.correct - clicking it');
              cy.get('img.correct')
                .should('be.visible')
                .first()
                .click({ force: true, timeout: 30000 });
            } else if ($body.find('.correct').length > 0) {
              cy.log('✅ Found .correct - clicking it');
              cy.get('.correct')
                .should('be.visible')
                .first()
                .click({ force: true, timeout: 30000 });
            } else if ($body.find('[aria-label="correct"]').length > 0) {
              cy.log('✅ Found aria-label correct - clicking it');
              cy.get('[aria-label="correct"]')
                .should('be.visible')
                .and('not.be.disabled')
                .click({ force: true, timeout: 30000 });
            } else {
              cy.log('❌ No correct answer found, clicking first available');
              cy.get(buttonClass).first().click({ force: true, timeout: 30000 });
            }
          });
        } else {
          // use correct class by default
          cy.get('.correct').click({ timeout: 60000 });
        }
      } else {
        return;
      }
    });
  }

  // Modified taskLoop function with screenshot capture
  function taskLoop(correctFlag, buttonClass) {
    // wait for fixation cross to go away - EXACT same timing as helpers
    cy.get('.lev-stimulus-container', { timeout: 60000 }).should('exist');

    // Take screenshot when stimulus appears
    cy.get('body').then(($body) => {
      const currentHash = getContentHash($body);
      if (currentHash !== lastContentHash) {
        takeScreenshot('stimulus-appeared');
        lastContentHash = currentHash;
      }
    });

    selectAnswers(correctFlag, buttonClass);
    instructions();

    cy.get('.lev-stimulus-container', { timeout: 60000 })
      .should('not.exist')
      .then(() => {
        // Don't take screenshot here - it's just blank screen after response
        // The next stimulus-appeared or instruction-screen will capture the next content

        if (taskCompleted) {
          takeScreenshot('task-completed');
          cy.log(`🎉 TROG helpers pattern capture completed with ${screenshotCounter} screenshots!`);
          return;
        } else {
          taskLoop(correctFlag, buttonClass);
        }
      });
  }

  function testAfcWithCapture(correctFlag, buttonClass) {
    // wait for OK button to be visible - EXACT same as helpers
    cy.contains('OK', { timeout: 600000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').click({ force: true }); // use regular click since fullscreen is mocked
    takeScreenshot('after-ok-click');
    
    taskLoop(correctFlag, buttonClass);
  }

  it('captures TROG screenshots using exact helpers timing pattern', () => {
    cy.visit('http://localhost:8080/?task=trog', {
      timeout: 60000,
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
      }
    });

    takeScreenshot('page-loaded');
    
    // Use the exact same pattern as working TROG test: testAfc('alt', '.image-medium')
    testAfcWithCapture('alt', '.image-medium');
  });
}); 