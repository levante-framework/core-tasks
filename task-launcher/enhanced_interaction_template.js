// Enhanced interaction strategy for all Levante framework tasks
// This template provides comprehensive interaction logic for:
// - Navigation buttons
// - Sliders and input fields  
// - Multiple choice questions
// - Audio controls
// - Fallback strategies

const enhancedInteractionLogic = `
      // Enhanced interaction strategy for Levante framework tasks
      cy.get('body').then(($body) => {
        // Strategy 1: Continue/OK/Next/Start buttons (highest priority)
        if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), button:contains("Begin")').first().click();
          cy.wait(1000); // Brief pause after navigation
        }
        // Strategy 2: Number line slider interactions
        else if ($body.find('input[type="range"], .slider, .number-line').length > 0) {
          // Interact with sliders by setting random values
          cy.get('input[type="range"], .slider input').then(($sliders) => {
            if ($sliders.length > 0) {
              const randomValue = Math.floor(Math.random() * 100) + 1;
              cy.wrap($sliders.first()).invoke('val', randomValue).trigger('input').trigger('change');
              cy.wait(500);
              // Look for submit button after slider interaction
              if ($body.find('button:contains("Submit"), button:contains("Done"), button:not([disabled])').length > 0) {
                cy.get('button:contains("Submit"), button:contains("Done"), button:not([disabled])').first().click();
              }
            }
          });
        }
        // Strategy 3: Multiple choice responses (task questions)
        else if ($body.find('[data-choice], .choice-button, .response-button, .answer-choice').length > 0) {
          // Click random answer choice
          cy.get('[data-choice], .choice-button, .response-button, .answer-choice').then(($choices) => {
            const randomIndex = Math.floor(Math.random() * $choices.length);
            cy.wrap($choices.eq(randomIndex)).click();
          });
        }
        // Strategy 4: Number input fields
        else if ($body.find('input[type="number"], input[type="text"]').length > 0) {
          cy.get('input[type="number"], input[type="text"]').then(($inputs) => {
            if ($inputs.length > 0) {
              const randomNumber = Math.floor(Math.random() * 20) + 1;
              cy.wrap($inputs.first()).clear().type(randomNumber.toString());
              cy.wait(500);
              // Look for submit after input
              if ($body.find('button:contains("Submit"), button:contains("Enter"), button:not([disabled])').length > 0) {
                cy.get('button:contains("Submit"), button:contains("Enter"), button:not([disabled])').first().click();
              }
            }
          });
        }
        // Strategy 5: Audio response buttons (listen/play again)
        else if ($body.find('button:contains("Play"), button:contains("Listen"), button:contains("Replay"), .audio-button').length > 0) {
          cy.get('button:contains("Play"), button:contains("Listen"), button:contains("Replay"), .audio-button').first().click();
          cy.wait(2000); // Wait for audio to play
        }
        // Strategy 6: Any enabled buttons (fallback)
        else if ($body.find('button:not([disabled]):visible').length > 0) {
          cy.get('button:not([disabled]):visible').first().click();
        }
        // Strategy 7: Clickable elements with data attributes
        else if ($body.find('[data-testid], [data-cy], .clickable, .btn').length > 0) {
          cy.get('[data-testid], [data-cy], .clickable, .btn').first().click();
        }
        // Strategy 8: Random button selection for multiple choice tasks
        else if ($body.find('button').length >= 2) {
          // Randomly click one of the available buttons
          const buttonIndex = Math.floor(Math.random() * $body.find('button').length);
          cy.get('button').eq(buttonIndex).click();
        }
        // Strategy 9: Try pressing Enter key to advance
        else {
          cy.get('body').type('{enter}');
        }
      });
`;

module.exports = enhancedInteractionLogic; 