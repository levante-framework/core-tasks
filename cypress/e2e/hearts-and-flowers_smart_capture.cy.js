describe('Task Screenshot Capture', () => {
  it('should capture screenshots with smart interactions', () => {
    const taskName = 'hearts-and-flowers';
    const interactionStrategy = 'spatial_response';
    const screenshotInterval = 8 * 1000;
    const maxDuration = 180 * 1000;
    let screenshotCount = 0;
    
    // Mock fullscreen API
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
        
        // Mock audio context for tasks that need it
        win.AudioContext = win.AudioContext || win.webkitAudioContext || function() {
          return {
            createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {} }),
            createGain: () => ({ connect: () => {}, gain: { value: 0 } }),
            destination: {},
            currentTime: 0
          };
        };
      }
    });

    // Initial screenshot
    cy.screenshot(`00-start`, { capture: 'viewport' });
    screenshotCount++;
    
    // Start interaction loop
    const startTime = Date.now();
    
    function performTaskSpecificInteraction() {
      const currentTime = Date.now();
      if (currentTime - startTime > maxDuration) {
        cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        return;
      }
      
      // Take screenshot
      cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-step-${screenshotCount - 1}`, { capture: 'viewport' });
      screenshotCount++;
      
      // Task-specific interaction logic
      cy.then(() => {
        switch (interactionStrategy) {
          case 'afc_multi_choice':
            return performAFCInteraction();
          case 'afc_with_slider':
            return performMathInteraction();
          case 'corsi_blocks':
            return performMemoryGameInteraction();
          case 'spatial_response':
            return performSpatialInteraction();
          case 'binary_choice':
            return performBinaryChoiceInteraction();
          case 'instruction_only':
            return performInstructionInteraction();
          default:
            return performGenericInteraction();
        }
      });
      
      // Continue loop
      cy.wait(screenshotInterval).then(() => {
        if (Date.now() - startTime < maxDuration) {
          performTaskSpecificInteraction();
        } else {
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        }
      });
    }
    
    // AFC (Alternative Forced Choice) interaction for most tasks
    function performAFCInteraction() {
      // Look for multiple choice buttons (2-4 options)
      cy.get('body').then($body => {
        // Try different button selectors in order of preference
        const selectors = [
          '#jspsych-html-multi-response-btngroup button',  // Most common
          '.jspsych-btn',                                   // Standard jsPsych buttons
          'button[data-choice]',                           // Choice buttons
          '.lev-response-row button',                      // Levante framework buttons
          'button:not(.replay):not(#replay-btn-revisited)', // Any button except replay
          'button'                                         // Fallback to any button
        ];
        
        for (let selector of selectors) {
          const buttons = $body.find(selector);
          if (buttons.length >= 2 && buttons.length <= 4) {
            // Found multi-choice buttons, click a random one
            const randomIndex = Math.floor(Math.random() * buttons.length);
            cy.get(selector).eq(randomIndex).click({ force: true });
            return;
          }
        }
        
        // Fallback: look for any clickable element
        performGenericInteraction();
      });
    }
    
    // Math task interaction (includes sliders)
    function performMathInteraction() {
      cy.get('body').then($body => {
        // Check for slider first
        if ($body.find('input[type="range"], .slider').length > 0) {
          cy.get('input[type="range"], .slider').first().then($slider => {
            const min = $slider.attr('min') || 0;
            const max = $slider.attr('max') || 100;
            const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
            cy.wrap($slider).invoke('val', randomValue).trigger('input').trigger('change');
          });
          
          // Look for submit/continue button after slider
          cy.wait(500);
          cy.get('button').contains(/continue|submit|next|ok/i).click({ force: true });
        } else {
          // No slider, use AFC interaction
          performAFCInteraction();
        }
      });
    }
    
    // Memory game interaction (Corsi blocks)
    function performMemoryGameInteraction() {
      cy.get('body').then($body => {
        // Look for Corsi blocks or memory game elements
        const corsiSelectors = [
          '.corsi-block',
          '.memory-block', 
          '[data-block]',
          '.block',
          'div[style*="background-color"]:not(.instructions)'
        ];
        
        let foundBlocks = false;
        for (let selector of corsiSelectors) {
          const blocks = $body.find(selector);
          if (blocks.length > 0) {
            // Click a random block
            const randomIndex = Math.floor(Math.random() * blocks.length);
            cy.get(selector).eq(randomIndex).click({ force: true });
            foundBlocks = true;
            break;
          }
        }
        
        if (!foundBlocks) {
          // Look for OK/Continue buttons (common in memory game instructions)
          const buttonSelectors = [
            'button:contains("OK")',
            'button:contains("Continue")', 
            'button:contains("Next")',
            'button:contains("Start")',
            '.jspsych-btn'
          ];
          
          for (let selector of buttonSelectors) {
            if ($body.find(selector).length > 0) {
              cy.get(selector).first().click({ force: true });
              return;
            }
          }
          
          performGenericInteraction();
        }
      });
    }
    
    // Spatial response (Hearts and Flowers)
    function performSpatialInteraction() {
      cy.get('body').then($body => {
        // Look for directional buttons or spatial elements
        const spatialSelectors = [
          'button[data-direction]',
          '.direction-button',
          'button:contains("←")',
          'button:contains("→")', 
          'button:contains("↑")',
          'button:contains("↓")',
          '.spatial-response button'
        ];
        
        let foundSpatial = false;
        for (let selector of spatialSelectors) {
          if ($body.find(selector).length > 0) {
            const buttons = $body.find(selector);
            const randomIndex = Math.floor(Math.random() * buttons.length);
            cy.get(selector).eq(randomIndex).click({ force: true });
            foundSpatial = true;
            break;
          }
        }
        
        if (!foundSpatial) {
          performAFCInteraction();
        }
      });
    }
    
    // Binary choice interaction
    function performBinaryChoiceInteraction() {
      cy.get('body').then($body => {
        const buttons = $body.find('button:not(.replay):not(#replay-btn-revisited)');
        if (buttons.length === 2) {
          // Exactly 2 buttons, pick randomly
          const randomIndex = Math.floor(Math.random() * 2);
          cy.get('button:not(.replay):not(#replay-btn-revisited)').eq(randomIndex).click({ force: true });
        } else {
          performAFCInteraction();
        }
      });
    }
    
    // Instruction-only interaction
    function performInstructionInteraction() {
      cy.get('body').then($body => {
        // Look for continue/next/OK buttons
        const instructionButtons = [
          'button:contains("Continue")',
          'button:contains("Next")',
          'button:contains("OK")',
          'button:contains("Start")',
          '.jspsych-btn'
        ];
        
        for (let selector of instructionButtons) {
          if ($body.find(selector).length > 0) {
            cy.get(selector).first().click({ force: true });
            return;
          }
        }
        
        performGenericInteraction();
      });
    }
    
    // Generic fallback interaction
    function performGenericInteraction() {
      cy.get('body').then($body => {
        // Try to find any clickable element
        const genericSelectors = [
          'button:not(.replay):not(#replay-btn-revisited):visible',
          'input[type="submit"]:visible',
          '[role="button"]:visible',
          '.clickable:visible',
          'a:visible'
        ];
        
        for (let selector of genericSelectors) {
          if ($body.find(selector).length > 0) {
            cy.get(selector).first().click({ force: true });
            return;
          }
        }
        
        // Last resort: click somewhere in the middle of the screen
        cy.get('body').click(400, 300, { force: true });
      });
    }
    
    // Start the interaction loop
    cy.wait(2000); // Wait for initial load
    performTaskSpecificInteraction();
  });
});
