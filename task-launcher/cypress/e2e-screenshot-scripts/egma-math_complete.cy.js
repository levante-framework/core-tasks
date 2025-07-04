describe('egma-math Robust Task Capture', () => {
  it('should robustly capture screenshots throughout the entire task', () => {
    const taskName = 'egma-math';
    const screenshotInterval = 6000; // 6 seconds
    const maxDuration = 10 * 60 * 1000; // 10 minutes
    let screenshotCount = 0;
    const endMessages = [/thank you/i, /task complete/i, /all done/i];
    let lastPageState = '';
    let stuckCounter = 0;
    const maxStuckIterations = 5;

    cy.visit(`http://localhost:8080/?task=${taskName}`, {
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
        // Mock audio context
        win.AudioContext = win.AudioContext || win.webkitAudioContext || function() {
          return {
            createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 440 } }),
            createGain: () => ({ connect: () => {}, gain: { value: 0.5 } }),
            destination: {},
            currentTime: 0,
            state: 'running'
          };
        };
      }
    });

    cy.screenshot(`00-start`, { capture: 'viewport' });
    screenshotCount++;
    const startTime = Date.now();

    function captureAndInteract() {
      const currentTime = Date.now();
      if (currentTime - startTime > maxDuration) {
        cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        return;
      }
      
      // Take screenshot
      cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-step-${screenshotCount - 1}`, { capture: 'viewport' });
      screenshotCount++;
      
      // Smart interaction logic with stuck detection
      cy.get('body').then($body => {
        const bodyText = $body.text();
        const currentPageState = bodyText + $body.find('button, input, select').length;
        
        // Check for end messages
        if (endMessages.some(re => re.test(bodyText))) {
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-end-detected`, { capture: 'viewport' });
          return;
        }
        
        // Detect if we're stuck (same page state as last iteration)
        const isStuck = currentPageState === lastPageState && lastPageState !== '';
        if (isStuck) {
          stuckCounter++;
          cy.log(`STUCK DETECTED: Iteration ${stuckCounter}/${maxStuckIterations}`);
        } else {
          stuckCounter = 0; // Reset counter if page changed
        }
        lastPageState = currentPageState;
        
        // If stuck for too long, try aggressive recovery
        if (stuckCounter >= maxStuckIterations) {
          cy.log('NUCLEAR RESTART: Refreshing page and restarting');
          cy.reload();
          cy.wait(3000);
          stuckCounter = 0;
          lastPageState = '';
          return;
        }
        
        // Enhanced interaction logic with stuck-specific strategies
        if (isStuck && stuckCounter > 1) {
          cy.log(`STUCK RECOVERY ATTEMPT ${stuckCounter}`);
          
          // Aggressive stuck recovery strategies
          if (stuckCounter === 2) {
            // Try all keyboard inputs
            cy.get('body').type(' {enter}{esc}');
            cy.wait(1000);
          } else if (stuckCounter === 3) {
            // Try clicking everywhere
            cy.get('body').click(100, 100, { force: true });
            cy.get('body').click(500, 300, { force: true });
            cy.get('body').click(800, 400, { force: true });
            cy.wait(1000);
          } else if (stuckCounter === 4) {
            // Try all possible elements
            cy.get('*').each(($el) => {
              if ($el.is(':visible') && ($el.is('button') || $el.is('input') || $el.is('a') || $el.attr('onclick'))) {
                cy.wrap($el).click({ force: true });
              }
            });
          }
        } else {
          // Normal interaction priority logic
          if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin")').length > 0) {
            cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin")').first().click({ force: true });
          }
          // Number line slider interactions
          else if ($body.find('input[type="range"], .slider, .number-line').length > 0) {
            cy.get('input[type="range"], .slider input').then($sliders => {
              if ($sliders.length > 0) {
                const randomValue = Math.floor(Math.random() * 100) + 1;
                cy.wrap($sliders.first()).invoke('val', randomValue).trigger('input').trigger('change');
                cy.wait(500);
                if ($body.find('button:contains("Submit"), button:contains("Done"), button:not([disabled])').length > 0) {
                  cy.get('button:contains("Submit"), button:contains("Done"), button:not([disabled])').first().click({ force: true });
                }
              }
            });
          }
          // Multiple choice responses
          else if ($body.find('[data-choice], .choice-button, .response-button, .answer-choice').length > 0) {
            cy.get('[data-choice], .choice-button, .response-button, .answer-choice').then($choices => {
              const randomIndex = Math.floor(Math.random() * $choices.length);
              cy.wrap($choices.eq(randomIndex)).click({ force: true });
            });
          }
          // Number input fields
          else if ($body.find('input[type="number"], input[type="text"]').length > 0) {
            cy.get('input[type="number"], input[type="text"]').then($inputs => {
              if ($inputs.length > 0) {
                const randomNumber = Math.floor(Math.random() * 20) + 1;
                cy.wrap($inputs.first()).clear().type(randomNumber.toString());
                cy.wait(500);
                if ($body.find('button:contains("Submit"), button:contains("Enter"), button:not([disabled])').length > 0) {
                  cy.get('button:contains("Submit"), button:contains("Enter"), button:not([disabled])').first().click({ force: true });
                }
              }
            });
          }
          // Audio response buttons
          else if ($body.find('button:contains("Play"), button:contains("Listen"), button:contains("Replay"), .audio-button').length > 0) {
            cy.get('button:contains("Play"), button:contains("Listen"), button:contains("Replay"), .audio-button').first().click({ force: true });
            cy.wait(2000);
          }
          // Any enabled buttons (fallback)
          else if ($body.find('button:not([disabled]):visible').length > 0) {
            cy.get('button:not([disabled]):visible').first().click({ force: true });
          }
          // Clickable elements with data attributes
          else if ($body.find('[data-testid], [data-cy], .clickable, .btn').length > 0) {
            cy.get('[data-testid], [data-cy], .clickable, .btn').first().click({ force: true });
          }
          // Random button selection for multiple choice tasks
          else if ($body.find('button').length >= 2) {
            const buttonIndex = Math.floor(Math.random() * $body.find('button').length);
            cy.get('button').eq(buttonIndex).click({ force: true });
          }
          // Try pressing Enter key to advance
          else {
            cy.get('body').type('{enter}');
            // Fallback: Click center of screen (from simple script)
            cy.get('body').click(500, 300, { force: true });
          }
        }
      });
      
      cy.wait(screenshotInterval).then(() => {
        if (Date.now() - startTime < maxDuration) {
          captureAndInteract();
        } else {
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        }
      });
    }
    
    cy.wait(3000).then(() => {
      captureAndInteract();
    });
  });
});
