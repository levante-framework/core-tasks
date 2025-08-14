#!/bin/bash

# Quick 3-Task Screenshot Capture
TASKS=("memory-game" "hearts-and-flowers" "matrix-reasoning")
BASE_URL="http://localhost:8080"

echo "Starting quick 3-task capture..."

for task in "${TASKS[@]}"; do
    echo "Processing task: $task"
    
    # Create Cypress test
    cat > "cypress/e2e/${task}_quick.cy.js" << EOF
describe('Quick Task Capture - ${task}', () => {
  it('should capture screenshots', () => {
    cy.visit('${BASE_URL}/?task=${task}', {
      onBeforeLoad(win) {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
      }
    });

    cy.screenshot('00-start');
    cy.wait(3000);
    
    // Take 10 screenshots with interactions
    for (let i = 0; i < 10; i++) {
      cy.get('body').then((\$body) => {
        const selectors = [
          'button:contains("OK")', 'button:contains("Continue")', 
          'button:contains("Next")', 'button:contains("Start")',
          '.jspsych-btn', 'button[type="button"]', '.btn', 'button'
        ];
        
        let clicked = false;
        for (const selector of selectors) {
          if (\$body.find(selector).length > 0) {
            cy.get(selector).first().then((\$el) => {
              if (\$el.is(':visible') && !clicked) {
                cy.wrap(\$el).click({ force: true });
                clicked = true;
              }
            });
            break;
          }
        }
        
        if (!clicked) {
          cy.get('body').click(500, 300, { force: true });
        }
      });
      
      cy.wait(5000);
      cy.screenshot(\`\${String(i + 1).padStart(2, '0')}-step-\${i}\`);
    }
    
    cy.screenshot('99-final');
  });
});
EOF
    
    # Run the test
    echo "Running Cypress test for $task..."
    npx cypress run --spec "cypress/e2e/${task}_quick.cy.js" --browser chrome --headless
    
    echo "Completed $task"
    sleep 2
done

echo "All 3 tasks completed! Check cypress/screenshots/ for results" 