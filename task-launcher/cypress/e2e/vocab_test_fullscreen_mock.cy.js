describe('Vocab Test with Fullscreen Mock and Screenshots', () => {
  let screenshotCounter = 0;

  function takeScreenshot(name) {
    if (Cypress.env('takeScreenshots')) {
      screenshotCounter++;
      const paddedCounter = screenshotCounter.toString().padStart(4, '0');
      cy.screenshot(`${paddedCounter}_vocab_${name}`, { 
        capture: 'viewport',
        overwrite: true 
      });
    }
  }

  beforeEach(() => {
    // Mock fullscreen API aggressively
    cy.window().then((win) => {
      // Mock fullscreen methods
      win.document.requestFullscreen = cy.stub().resolves();
      win.document.exitFullscreen = cy.stub().resolves();
      win.document.webkitRequestFullscreen = cy.stub().resolves();
      win.document.mozRequestFullScreen = cy.stub().resolves();
      win.document.msRequestFullscreen = cy.stub().resolves();
      
      // Mock fullscreen properties
      Object.defineProperty(win.document, 'fullscreenElement', {
        value: win.document.documentElement,
        writable: true,
        configurable: true
      });
      Object.defineProperty(win.document, 'webkitFullscreenElement', {
        value: win.document.documentElement,
        writable: true,
        configurable: true
      });
      Object.defineProperty(win.document, 'mozFullScreenElement', {
        value: win.document.documentElement,
        writable: true,
        configurable: true
      });
      
      // Mock fullscreen enabled
      Object.defineProperty(win.document, 'fullscreenEnabled', {
        value: true,
        writable: true,
        configurable: true
      });
      
      // Mock element fullscreen methods
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      win.document.documentElement.webkitRequestFullscreen = cy.stub().resolves();
      win.document.documentElement.mozRequestFullScreen = cy.stub().resolves();
      
      // Mock screen orientation
      if (win.screen && win.screen.orientation) {
        win.screen.orientation.lock = cy.stub().resolves();
      }
      
      // Dispatch fullscreen change event
      const fullscreenEvent = new Event('fullscreenchange');
      win.document.dispatchEvent(fullscreenEvent);
    });
  });

  it('Vocab test with aggressive fullscreen bypass and comprehensive screenshots', () => {
    const vocabUrl = 'http://localhost:8080/?task=vocab';
    
    cy.visit(vocabUrl);
    takeScreenshot('initial_visit');
    
    // Wait for initial load
    cy.wait(3000);
    takeScreenshot('page_loaded_3s');
    
    // Aggressively mock fullscreen state
    cy.window().then((win) => {
      // Set fullscreen element
      win.document.fullscreenElement = win.document.documentElement;
      
      // Mock all possible fullscreen checks
      win.document.webkitFullscreenElement = win.document.documentElement;
      win.document.mozFullScreenElement = win.document.documentElement;
      win.document.msFullscreenElement = win.document.documentElement;
      
      // Dispatch multiple fullscreen events
      const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
      events.forEach(eventName => {
        const event = new Event(eventName);
        win.document.dispatchEvent(event);
      });
      
      takeScreenshot('aggressive_fullscreen_mocked');
    });
    
    // Try to directly bypass fullscreen prompts by manipulating DOM
    cy.get('body').then(($body) => {
      // Hide any fullscreen prompts
      const fullscreenElements = $body.find('*').filter(function() {
        const text = $(this).text().toLowerCase();
        return text.includes('fullscreen') || text.includes('full screen') || text.includes('switch to');
      });
      
      fullscreenElements.each(function() {
        $(this).hide();
      });
      
      takeScreenshot('fullscreen_prompts_hidden');
    });
    
    // Wait and try to force start the test
    cy.wait(2000);
    
    // Look for and click any start/begin buttons aggressively
    cy.get('body').then(($body) => {
      const startSelectors = [
        'button:contains("Start")',
        'button:contains("Begin")',
        'button:contains("Continue")',
        'button:contains("OK")',
        'button:contains("Next")',
        '.start-btn',
        '.begin-btn',
        '.continue-btn',
        '.primary',
        '.jspsych-btn'
      ];
      
      for (const selector of startSelectors) {
        try {
          const elements = $body.find(selector);
          if (elements.length > 0) {
            elements.first().click();
            takeScreenshot(`clicked_start_${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
            break;
          }
        } catch (e) {
          console.log(`Could not click ${selector}`);
        }
      }
    });
    
    // Wait for test to potentially start
    cy.wait(3000);
    takeScreenshot('after_start_attempt');
    
    // Now start the main monitoring loop with vocab-specific focus
    let monitoringActive = true;
    let interactionCount = 0;
    let imageCount = 0;
    let hasSeenContent = false;
    
    function performVocabInteractions() {
      if (!monitoringActive || interactionCount > 400) return;
      
      interactionCount++;
      
      // Take frequent screenshots
      if (interactionCount % 2 === 0) {
        takeScreenshot(`monitoring_${interactionCount}`);
      }
      
      cy.get('body').then(($body) => {
        const bodyText = $body.text().toLowerCase();
        
        // Check for vocab-specific content
        const vocabIndicators = ['vocabulary', 'vocab', 'word', 'picture', 'image', 'choose', 'select', 'which'];
        const hasVocabContent = vocabIndicators.some(indicator => bodyText.includes(indicator));
        
        if (hasVocabContent && !hasSeenContent) {
          hasSeenContent = true;
          takeScreenshot(`vocab_content_detected_${interactionCount}`);
        }
        
        // Count and screenshot any images that appear
        const images = $body.find('img:visible, canvas:visible, svg:visible');
        if (images.length > imageCount) {
          imageCount = images.length;
          takeScreenshot(`images_detected_count_${imageCount}_${interactionCount}`);
          
          // Log image details
          images.each((index, img) => {
            if (img.tagName === 'IMG') {
              const src = img.src;
              const alt = img.alt || 'no-alt';
              console.log(`Image ${index}: ${src} (alt: ${alt})`);
            }
          });
        }
        
        // Look for multiple choice options (very common in vocab tests)
        const choiceElements = $body.find([
          '[data-choice]',
          '.choice',
          '.option', 
          '.vocab-choice',
          '.vocab-option',
          'input[type="radio"]:visible',
          'input[type="checkbox"]:visible',
          '.jspsych-survey-multi-choice-option',
          '[role="button"]:visible'
        ].join(', '));
        
        if (choiceElements.length > 0) {
          takeScreenshot(`choices_found_${choiceElements.length}_options_${interactionCount}`);
          
          // Click a random choice
          const randomIndex = Math.floor(Math.random() * choiceElements.length);
          const randomChoice = choiceElements.eq(randomIndex);
          if (randomChoice.is(':visible') && randomChoice.width() > 0 && randomChoice.height() > 0) {
            randomChoice.click();
            takeScreenshot(`choice_selected_${randomIndex}_${interactionCount}`);
            
            // Wait to see result
            cy.wait(1000);
            takeScreenshot(`after_choice_${randomIndex}_${interactionCount}`);
          }
        }
        
        // Look for navigation buttons
        const navSelectors = [
          'button:visible',
          '.jspsych-btn:visible',
          '.continue-btn:visible',
          '.next-btn:visible',
          '.submit-btn:visible',
          'input[type="submit"]:visible',
          'input[type="button"]:visible'
        ];
        
        for (const selector of navSelectors) {
          const elements = $body.find(selector);
          if (elements.length > 0) {
            const element = elements.first();
            if (element.is(':visible') && element.width() > 0 && element.height() > 0) {
              const buttonText = element.text().toLowerCase();
              
              // Prioritize certain buttons
              if (buttonText.includes('continue') || buttonText.includes('next') || buttonText.includes('submit')) {
                takeScreenshot(`nav_button_${buttonText.replace(/\s+/g, '_')}_${interactionCount}`);
                element.click();
                takeScreenshot(`nav_clicked_${buttonText.replace(/\s+/g, '_')}_${interactionCount}`);
                
                // Wait to see what happens
                cy.wait(1500);
                takeScreenshot(`nav_result_${buttonText.replace(/\s+/g, '_')}_${interactionCount}`);
                break;
              }
            }
          }
        }
        
        // Check for completion
        const completionTexts = ['thank you', 'complete', 'finished', 'done', 'exit', 'end of task', 'task complete'];
        const isComplete = completionTexts.some(text => bodyText.includes(text));
        
        if (isComplete) {
          takeScreenshot(`completion_detected_${interactionCount}`);
          monitoringActive = false;
          return;
        }
        
        // Continue monitoring
        if (monitoringActive && interactionCount < 400) {
          cy.wait(600).then(() => {
            performVocabInteractions();
          });
        }
      });
    }
    
    // Start the interaction loop
    cy.wait(2000).then(() => {
      takeScreenshot('starting_vocab_interactions');
      performVocabInteractions();
    });
    
    // Wait for completion (vocab tests can be long)
    cy.wait(80000);
    takeScreenshot('final_state');
    
    // Final check for any content
    cy.get('body').then(($body) => {
      const finalImages = $body.find('img:visible, canvas:visible, svg:visible');
      if (finalImages.length > 0) {
        takeScreenshot(`final_images_count_${finalImages.length}`);
      }
      
      const bodyText = $body.text();
      if (bodyText.length > 100) {
        takeScreenshot('final_content_detected');
      }
    });
  });
}); 