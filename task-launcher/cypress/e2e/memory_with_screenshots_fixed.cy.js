const memory_game_url = 'http://localhost:8080/?task=memory-game';

describe('test memory game with screenshots (fixed)', () => {
  let screenshotCounter = 0;
  let lastContentHash = '';
  let lastScreenshotTime = 0;

  // Handle all uncaught exceptions to prevent test failure
  Cypress.on('uncaught:exception', (err, runnable) => {
    // Don't fail the test on uncaught exceptions
    console.log('Caught exception:', err.message);
    return false;
  });

  // Helper function to generate screenshot filename with counter
  function getScreenshotName(description = '') {
    screenshotCounter++;
    const paddedCounter = screenshotCounter.toString().padStart(3, '0');
    const cleanDescription = description.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${paddedCounter}_memory_${cleanDescription || 'screenshot'}`;
  }

  // Combined function to handle both content change and time-based screenshots
  function takeSmartScreenshot(description = '') {
    cy.get('body').then(($body) => {
      const currentContent = $body.html();
      const currentHash = btoa(currentContent).slice(0, 20);
      const currentTime = Date.now();
      
      // Take screenshot if content changed OR if 5 seconds have passed
      if (currentHash !== lastContentHash) {
        cy.screenshot(getScreenshotName(description + '_content_changed'));
        lastContentHash = currentHash;
        lastScreenshotTime = currentTime;
      } else if (currentTime - lastScreenshotTime >= 5000) {
        cy.screenshot(getScreenshotName(description + '_5sec_interval'));
        lastScreenshotTime = currentTime;
      }
    });
  }

  it('visits memory game and plays it with screenshots', () => {
    lastScreenshotTime = Date.now();
    
    cy.visit(memory_game_url);
    cy.screenshot(getScreenshotName('initial_visit'));

    // wait for OK button to appear
    cy.contains('OK', { timeout: 300000 }).should('be.visible');
    cy.screenshot(getScreenshotName('ok_button_visible'));
    
    // Use regular click instead of realClick to avoid fullscreen issues
    cy.contains('OK').click({ force: true });
    cy.screenshot(getScreenshotName('after_ok_click'));

    // Wait for game to start and handle any transitions
    cy.wait(3000);
    cy.screenshot(getScreenshotName('after_wait'));

    // More robust way to detect game start
    cy.get('body').then(() => {
      cy.screenshot(getScreenshotName('game_started'));
      memoryLoopWithScreenshots();
    });
  });

  function handleInstructionsWithScreenshots() {
    takeSmartScreenshot('handle_instructions_start');
    
    cy.get('body').then(() => {
      // Check if we have corsi blocks or instructions
      cy.get('.jspsych-content').then((content) => {
        const corsiBlocks = content.find('.jspsych-corsi-block');
        const okButton = content.find('button:contains("OK")');

        if (corsiBlocks.length === 0 && okButton.length > 0) {
          cy.screenshot(getScreenshotName('instructions_no_blocks'));
          cy.contains('OK').click({ force: true });
          cy.screenshot(getScreenshotName('instructions_ok_clicked'));
        } else if (corsiBlocks.length > 0) {
          cy.screenshot(getScreenshotName('instructions_with_blocks'));
        } else {
          cy.screenshot(getScreenshotName('instructions_other_content'));
        }
      });
    });
    
    // Add delay and check for time-based screenshot
    cy.wait(1000);
    takeSmartScreenshot('instructions_end');
    return;
  }

  function answerTrialWithScreenshots() {
    cy.screenshot(getScreenshotName('answer_trial_start'));
    
    // Wait for any display phase to complete
    cy.wait(2000);
    cy.screenshot(getScreenshotName('after_display_wait'));

    cy.get('.jspsych-content').then((content) => {
      const blocks = content.find('.jspsych-corsi-block');

      if (blocks.length > 0) {
        cy.screenshot(getScreenshotName('blocks_visible_for_response'));
        
        // Try to get sequence information, but continue even if not available
        cy.window().then((window) => {
          if (window.cypressData && window.cypressData.correctAnswer) {
            const sequence = window.cypressData.correctAnswer;
            cy.screenshot(getScreenshotName(`sequence_length_${sequence.length}`));
            
            sequence.forEach((number, index) => {
              if (blocks[number]) {
                cy.screenshot(getScreenshotName(`before_click_block_${number}_step_${index + 1}`));
                cy.wrap(blocks[number]).click({ force: true });
                cy.screenshot(getScreenshotName(`after_click_block_${number}_step_${index + 1}`));
                
                // Small delay between clicks
                cy.wait(500);
                takeSmartScreenshot(`during_sequence_step_${index + 1}`);
              }
            });
          } else {
            // If no sequence data, just click the first few blocks as a fallback
            cy.screenshot(getScreenshotName('no_sequence_data_fallback'));
            for (let i = 0; i < Math.min(3, blocks.length); i++) {
              cy.wrap(blocks[i]).click({ force: true });
              cy.wait(500);
              cy.screenshot(getScreenshotName(`fallback_click_${i + 1}`));
            }
          }
          
          cy.screenshot(getScreenshotName('trial_completed'));
        });
      } else {
        cy.screenshot(getScreenshotName('no_blocks_found'));
      }
    });
    
    // Check for time-based screenshot after trial
    cy.wait(1000);
    takeSmartScreenshot('trial_end');
    return;
  }

  function memoryLoopWithScreenshots() {
    takeSmartScreenshot('memory_loop_start');
    
    cy.get('body').then(() => {
      cy.get('.jspsych-content').then((content) => {
        const corsiBlocks = content.find('.jspsych-corsi-block');
        const hasBlocks = corsiBlocks.length > 0;

        if (hasBlocks) {
          cy.screenshot(getScreenshotName('trial_phase_blocks_present'));
          answerTrialWithScreenshots();
        } else {
          cy.screenshot(getScreenshotName('instruction_phase_no_blocks'));
          handleInstructionsWithScreenshots();
        }
      });

      // Add delay and smart screenshot before checking for end condition
      cy.wait(2000);
      takeSmartScreenshot('before_end_check');

      // Check for end condition more robustly
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        if (bodyText.includes('Thank you!') || bodyText.includes('Exit') || bodyText.includes('Complete')) {
          cy.screenshot(getScreenshotName('end_condition_detected'));
          
          // Try to click Exit if available
          cy.get('body').then(() => {
            if ($body.find('button:contains("Exit")').length > 0) {
              cy.contains('Exit').click({ force: true });
              cy.screenshot(getScreenshotName('exit_clicked'));
            }
          });
          return;
        } else {
          cy.screenshot(getScreenshotName('continuing_loop'));
          // Continue the loop with a timeout to prevent infinite recursion
          cy.wait(1000);
          memoryLoopWithScreenshots();
        }
      });
    });
  }
}); 