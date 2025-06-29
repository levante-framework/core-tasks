describe('Simple Screenshot Test', () => {
  it('should take hundreds of screenshots of the hearts and flowers page', () => {
    // Handle the fullscreen permission error that will occur
    Cypress.on('uncaught:exception', (err, runnable) => {
      if (err.message.includes('Permissions check failed') || err.message.includes('Fullscreen')) {
        return false; // Don't fail the test for fullscreen permission errors
      }
    });

    // Visit the page
    cy.visit('http://localhost:8080/?task=hearts-and-flowers');
    
    // Take initial screenshots every 500ms for 10 seconds
    for (let i = 1; i <= 20; i++) {
      cy.wait(500);
      cy.takeGameScreenshot(`initial_phase_${i}`);
    }
    
    // Wait for page to load
    cy.wait(3000);
    
    // Take screenshots every 1 second for 30 seconds
    for (let i = 1; i <= 30; i++) {
      cy.wait(1000);
      cy.takeGameScreenshot(`loading_phase_${i}`);
    }
    
    // Check what's on the page and handle fullscreen
    cy.get('body').then(($body) => {
      const pageText = $body.text();
      cy.log('Page contains:', pageText.substring(0, 200) + '...');
      
      if (pageText.includes('Switch to Full Screen mode') || pageText.includes('Switch to full screen mode')) {
        // Take screenshots every 500ms for 10 seconds while showing fullscreen prompt
        for (let i = 1; i <= 20; i++) {
          cy.wait(500);
          cy.takeGameScreenshot(`fullscreen_prompt_${i}`);
        }
        
        // Look for various possible button selectors
        cy.get('body').then(($body) => {
          // Try multiple selectors for the OK/Start button
          const possibleButtons = [
            'button:contains("OK")',
            'button:contains("Start")', 
            'button:contains("Begin")',
            '.primary',
            '.btn-primary',
            '[class*="ok"]',
            '[class*="OK"]',
            '[class*="start"]',
            '[class*="Start"]',
            'button',
            '.jspsych-btn',
            '.jspsych-button'
          ];
          
          let foundButton = null;
          for (const selector of possibleButtons) {
            const button = $body.find(selector);
            if (button.length > 0) {
              foundButton = button.first();
              cy.log(`Found button with selector: ${selector}`);
              break;
            }
          }
          
          if (foundButton) {
            // Take screenshots before clicking
            for (let i = 1; i <= 10; i++) {
              cy.wait(200);
              cy.takeGameScreenshot(`before_click_${i}`);
            }
            
            cy.wrap(foundButton).click();
            
            // Take screenshots every 200ms for 20 seconds after clicking
            for (let i = 1; i <= 100; i++) {
              cy.wait(200);
              cy.takeGameScreenshot(`after_click_${i}`);
            }
            
            // Take screenshots every 1 second for 30 more seconds
            for (let i = 1; i <= 30; i++) {
              cy.wait(1000);
              cy.takeGameScreenshot(`post_click_${i}`);
            }
            
            // Wait a bit more and check if we're in the game
            cy.wait(2000);
            cy.get('body').then(($newBody) => {
              const newText = $newBody.text();
              if (!newText.includes('Switch to Full Screen mode') && !newText.includes('Switch to full screen mode')) {
                // Take screenshots every 500ms for 10 seconds if game started
                for (let i = 1; i <= 20; i++) {
                  cy.wait(500);
                  cy.takeGameScreenshot(`game_started_${i}`);
                }
              } else {
                // Take screenshots every 500ms for 10 seconds if still showing fullscreen prompt
                for (let i = 1; i <= 20; i++) {
                  cy.wait(500);
                  cy.takeGameScreenshot(`still_fullscreen_${i}`);
                }
              }
            });
          } else {
            // Take screenshots every 500ms for 10 seconds if no button found
            for (let i = 1; i <= 20; i++) {
              cy.wait(500);
              cy.takeGameScreenshot(`no_button_${i}`);
            }
          }
        });
      } else {
        // Take screenshots every 500ms for 10 seconds if no fullscreen prompt
        for (let i = 1; i <= 20; i++) {
          cy.wait(500);
          cy.takeGameScreenshot(`no_fullscreen_${i}`);
        }
      }
    });
    
    // Take final screenshots every 1 second for 10 seconds
    for (let i = 1; i <= 10; i++) {
      cy.wait(1000);
      cy.takeGameScreenshot(`final_${i}`);
    }
  });
}); 