describe('Hearts and Flowers Helpers Pattern Capture', () => {
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
    const hearts = $body.find('img[src*="heart"]').length;
    const flowers = $body.find('img[src*="flower"]').length;
    const feedbackContainer = $body.find('.haf-cr-container').length;
    const smilingFace = $body.find('img[src*="smiling"]').length;
    return `${visibleText.length}-${visibleElements}-${buttons}-${images}-${hearts}-${flowers}-${feedbackContainer}-${smilingFace}`;
  };

  // Hearts and Flowers main loop (exact copy of working hafLoop)
  function hafLoop() {
    // end if there are no elements inside jspsych content
    cy.get('.jspsych-content').then((content) => {
      if (content.children().length) {
        const okButton = content.find('.primary');
        
        // Take screenshot of current state
        cy.get('body').then(($body) => {
          const currentHash = getContentHash($body);
          if (currentHash !== lastContentHash) {
            if (okButton.length) {
              takeScreenshot('instruction-screen');
            } else {
              takeScreenshot('content-screen');
            }
            lastContentHash = currentHash;
          }
        });

        // Make the decision here to handle instructions or pick an answer (EXACT same as working test)
        if (okButton.length) {
          handleInstructions();
        } else {
          pickAnswer();
        }
        
        cy.wait(1000); // wait for screen to render
        hafLoop();
      } else {
        // Task completed
        takeScreenshot('task-completed');
        cy.log(`🎉 Hearts and Flowers capture completed with ${screenshotCounter} screenshots!`);
        taskCompleted = true;
      }
    });
  }

  function handleInstructions() {
    cy.get('.jspsych-content').then((content) => {
      const okButton = content.find('.primary');

      if (okButton.length) {
        // Check for end of task
        cy.get('body').then(($body) => {
          if ($body.find('footer').length === 1) {
            takeScreenshot('task-ending');
            cy.contains('Exit').click({ timeout: 60000 });
            taskCompleted = true;
            return;
          } else {
            cy.contains('OK').click();
          }
        });
      }
    });
  }

  function pickAnswer() {
    // wait for feedback screen to end (EXACT same as working test)
    cy.get('.haf-stimulus-holder').should('exist');

    cy.get('.jspsych-content').then((content) => {
      const stimContainer = content.find('.haf-stimulus-container');

      if (stimContainer.length) {
        // This is a stimulus screen - take screenshot and pick answer
        cy.get('body').then(($body) => {
          const currentHash = getContentHash($body);
          if (currentHash !== lastContentHash) {
            takeScreenshot('stimulus-with-choices');
            lastContentHash = currentHash;
          }
        });

        // check for presence of stimulus on left side
        const leftStim = stimContainer.find('.stimulus-left');

        // get position of stimulus based on whether leftStim exists
        const pos = leftStim.length ? 0 : 1;

        // get stimulus image itself and then click button based on src and pos
        const stim = cy.get('[alt="heart or flower"]');
        stim.invoke('attr', 'src').then((src) => {
          // click the correct button
          const correctButtonIndex = getCorrectButtonIdx(src, pos);
          cy.log(`🎯 Clicking button ${correctButtonIndex} for ${src} at position ${pos}`);
          cy.get('.secondary--green').eq(correctButtonIndex).click();
        });
      } else {
        // No stimulus container - this might be feedback or other content
        // Just return and let the loop continue (EXACT same as working test)
        cy.log('📄 No stimulus container found - continuing loop');
        return;
      }
    });
  }

  // uses image src and image position to get the right button index
  function getCorrectButtonIdx(src, pos) {
    const shape = src.split('/').pop();

    if (shape === 'heart.png') {
      cy.log('💖 Heart detected - same side rule');
      return pos;
    } else if (shape === 'flower.png') {
      cy.log('🌸 Flower detected - opposite side rule');
      if (pos === 1) {
        return 0;
      } else if (pos === 0) {
        return 1;
      }
    }
    
    // fallback
    cy.log('❌ Unknown stimulus, clicking first button');
    return 0;
  }

  it('captures Hearts and Flowers screenshots using exact working hafLoop pattern', () => {
    cy.visit('http://localhost:8080/?task=hearts-and-flowers', {
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

    // wait for OK button to appear
    cy.contains('OK', { timeout: 300000 }).should('be.visible');
    takeScreenshot('ok-button-visible');
    
    cy.contains('OK').click({ force: true }); // use regular click since fullscreen is mocked
    takeScreenshot('after-ok-click');

    hafLoop();
  });
}); 