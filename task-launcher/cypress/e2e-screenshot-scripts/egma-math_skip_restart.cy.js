describe('egma-math Skip-Restart Task Capture', () => {
  it('should capture screenshots with skip-restart anti-stuck strategy', () => {
    const taskName = 'egma-math';
    const screenshotInterval = 8000; // 8 seconds
    const maxDuration = 8 * 60 * 1000; // 8 minutes
    let screenshotCount = 0;
    const endMessages = [/thank you/i, /task complete/i, /all done/i, /finished/i, /great job/i];
    let lastPageState = '';
    let stuckCounter = 0;
    const maxStuckIterations = 3;
    let urlConfigIndex = 0;
    
    // Multiple URL configurations to try when stuck
    const urlConfigs = [
      `http://localhost:8080/?task=${taskName}`,
      `http://localhost:8080/?task=${taskName}&skip=true`,
      `http://localhost:8080/?task=${taskName}&skipInstructions=true`,
      `http://localhost:8080/?task=${taskName}&practiceTrials=0`,
      `http://localhost:8080/?task=${taskName}&trials=5&practiceTrials=0`,
      `http://localhost:8080/?task=${taskName}&heavyInstructions=false&skip=true`
    ];

    function visitWithMocking(url) {
      cy.visit(url, {
        onBeforeLoad(win) {
          // Enhanced fullscreen API mocking
          win.document.documentElement.requestFullscreen = cy.stub().resolves();
          Object.defineProperty(win.document, 'fullscreenElement', {
            get: () => win.document.documentElement,
            configurable: true
          });
          Object.defineProperty(win.document, 'fullscreenEnabled', {
            get: () => true,
            configurable: true
          });
          Object.defineProperty(win.screen, 'orientation', {
            get: () => ({ lock: cy.stub().resolves() }),
            configurable: true
          });
          
          // Mock audio context for EGMA
          win.AudioContext = win.AudioContext || win.webkitAudioContext || function() {
            return {
              createOscillator: () => ({ 
                connect: () => {}, 
                start: () => {}, 
                stop: () => {}, 
                frequency: { value: 440 } 
              }),
              createGain: () => ({ 
                connect: () => {}, 
                gain: { value: 0.5 } 
              }),
              destination: {},
              currentTime: 0,
              state: 'running'
            };
          };
        }
      });
    }

    // Start with first URL configuration
    visitWithMocking(urlConfigs[0]);
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
      
      // Smart interaction with skip-restart logic
      cy.get('body').then($body => {
        const bodyText = $body.text().toLowerCase();
        const buttonCount = $body.find('button').length;
        const inputCount = $body.find('input').length;
        const currentPageState = bodyText + buttonCount + inputCount;
        
        // Check for end messages
        if (endMessages.some(re => re.test(bodyText))) {
          cy.log('END MESSAGE DETECTED');
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-end-detected`, { capture: 'viewport' });
          return;
        }
        
        // Detect if stuck (same page state as last iteration)
        const isStuck = currentPageState === lastPageState && lastPageState !== '';
        if (isStuck) {
          stuckCounter++;
          cy.log(`STUCK DETECTED: Iteration ${stuckCounter}/${maxStuckIterations}`);
        } else {
          stuckCounter = 0; // Reset if page changed
        }
        lastPageState = currentPageState;
        
        // Skip-restart strategy when stuck
        if (stuckCounter >= maxStuckIterations) {
          urlConfigIndex = (urlConfigIndex + 1) % urlConfigs.length;
          const nextUrl = urlConfigs[urlConfigIndex];
          cy.log(`SKIP-RESTART: Trying URL config ${urlConfigIndex + 1}: ${nextUrl}`);
          
          visitWithMocking(nextUrl);
          cy.wait(3000);
          stuckCounter = 0;
          lastPageState = '';
          return;
        }
        
        // EGMA-specific interaction logic
        if (bodyText.includes('continue') || bodyText.includes('next') || bodyText.includes('start')) {
          cy.get('button:contains("Continue"), button:contains("Next"), button:contains("Start"), button:contains("OK"), button:contains("Begin")').first().click({ force: true });
        }
        // Number line interactions for EGMA math problems
        else if ($body.find('input[type="range"], .slider, .number-line, [data-slider]').length > 0) {
          cy.get('input[type="range"], .slider input, .number-line input').then($sliders => {
            if ($sliders.length > 0) {
              const randomValue = Math.floor(Math.random() * 100) + 1;
              cy.wrap($sliders.first()).invoke('val', randomValue).trigger('input').trigger('change');
              cy.wait(1000);
              // Look for submit button
              if ($body.find('button:contains("Submit"), button:contains("Done"), button:not([disabled])').length > 0) {
                cy.get('button:contains("Submit"), button:contains("Done"), button:not([disabled])').first().click({ force: true });
              }
            }
          });
        }
        // Multiple choice or answer selection
        else if ($body.find('[data-choice], .choice-button, .answer-choice, .response-option').length > 0) {
          cy.get('[data-choice], .choice-button, .answer-choice, .response-option').then($choices => {
            const randomIndex = Math.floor(Math.random() * $choices.length);
            cy.wrap($choices.eq(randomIndex)).click({ force: true });
          });
        }
        // Number input fields
        else if ($body.find('input[type="number"], input[type="text"]').filter(':visible').length > 0) {
          cy.get('input[type="number"], input[type="text"]').filter(':visible').then($inputs => {
            if ($inputs.length > 0) {
              const randomNumber = Math.floor(Math.random() * 20) + 1;
              cy.wrap($inputs.first()).clear().type(randomNumber.toString());
              cy.wait(1000);
              // Try to submit
              if ($body.find('button:contains("Submit"), button:contains("Enter"), button:not([disabled])').length > 0) {
                cy.get('button:contains("Submit"), button:contains("Enter"), button:not([disabled])').first().click({ force: true });
              }
            }
          });
        }
        // Audio controls for EGMA
        else if ($body.find('button:contains("Play"), button:contains("Listen"), .audio-button').length > 0) {
          cy.get('button:contains("Play"), button:contains("Listen"), .audio-button').first().click({ force: true });
          cy.wait(2000);
        }
        // Any visible enabled buttons
        else if ($body.find('button:not([disabled]):visible').length > 0) {
          cy.get('button:not([disabled]):visible').first().click({ force: true });
        }
        // Data attribute elements
        else if ($body.find('[data-testid], [data-cy], .clickable').length > 0) {
          cy.get('[data-testid], [data-cy], .clickable').first().click({ force: true });
        }
        // Random button if multiple options
        else if ($body.find('button').length >= 2) {
          const randomIndex = Math.floor(Math.random() * $body.find('button').length);
          cy.get('button').eq(randomIndex).click({ force: true });
        }
        // Keyboard fallbacks
        else {
          cy.get('body').type('{enter}');
          cy.wait(500);
          cy.get('body').click(500, 300, { force: true });
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