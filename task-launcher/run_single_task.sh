#!/bin/bash

# Single Task Runner Script
# Usage: ./run_single_task.sh [task-name]
# Example: ./run_single_task.sh theory-of-mind

if [ $# -eq 0 ]; then
    echo "🎯 Single Task Screenshot Capture"
    echo "Usage: $0 <task-name>"
    echo ""
    echo "Available tasks:"
    echo "  theory-of-mind"
    echo "  egma-math"
    echo "  memory-game"
    echo "  matrix-reasoning"
    echo "  hearts-and-flowers"
    echo "  mental-rotation"
    echo "  same-different-selection"
    echo "  trog"
    echo "  vocab"
    echo "  roar-inference"
    echo "  adult-reasoning"
    echo "  intro"
    echo ""
    echo "Example: $0 theory-of-mind"
    exit 1
fi

TASK_NAME=$1
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="cypress_${TASK_NAME}_${TIMESTAMP}.log"

echo "🚀 Starting screenshot capture for: $TASK_NAME"
echo "📝 Log file: $LOG_FILE"
echo "📸 Screenshots will be timestamped and saved"
echo ""

# Create a temporary test file with the specific task
cat > cypress/e2e/temp_single_task.cy.js << EOF
// Temporary single task capture for: $TASK_NAME
const TASK_NAME = '$TASK_NAME';

describe(\`Single Task Capture - \${TASK_NAME}\`, () => {
  it(\`captures complete \${TASK_NAME} task until completion\`, () => {
    let screenshotCounter = 0;
    let maxSteps = 200; // Increased limit to capture complete tasks like Theory of Mind
    let completionDetected = false;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    // Handle DOM detachment and other errors
    Cypress.on('uncaught:exception', (err, runnable) => {
      if (err.message.includes('detached from the DOM') || 
          err.message.includes('not attached') ||
          err.message.includes('requery') ||
          err.message.includes('Permissions check failed') ||
          err.message.includes('fullscreen')) {
        console.log('Ignoring DOM/permission/fullscreen error:', err.message);
        return false;
      }
      return true;
    });
    
    // Enhanced fullscreen mocking function
    function visitWithFullscreenMocking(url) {
      cy.visit(url, {
        timeout: 120000, // 2 minutes timeout for initial load
        onBeforeLoad: (win) => {
          // Enhanced fullscreen mocking
          win.document.documentElement.requestFullscreen = cy.stub().resolves();
          win.document.exitFullscreen = cy.stub().resolves();
          Object.defineProperty(win.document, 'fullscreenElement', {
            get: () => win.document.documentElement
          });
          Object.defineProperty(win.document, 'fullscreenEnabled', {
            get: () => true
          });
          Object.defineProperty(win.screen, 'orientation', {
            value: { lock: cy.stub().resolves() },
            writable: true
          });
          
          // Additional mocking
          win.screen.lockOrientation = cy.stub().resolves();
          win.screen.mozLockOrientation = cy.stub().resolves();
          win.screen.msLockOrientation = cy.stub().resolves();
          
          // Even more aggressive fullscreen mocking
          win.document.webkitRequestFullscreen = cy.stub().resolves();
          win.document.mozRequestFullScreen = cy.stub().resolves();
          win.document.msRequestFullscreen = cy.stub().resolves();
          win.document.webkitExitFullscreen = cy.stub().resolves();
          win.document.mozCancelFullScreen = cy.stub().resolves();
          win.document.msExitFullscreen = cy.stub().resolves();
          
          // Mock fullscreen change events
          win.document.addEventListener = cy.stub();
          win.document.removeEventListener = cy.stub();
          
          // Override any fullscreen checks
          Object.defineProperty(win.document, 'webkitFullscreenElement', {
            get: () => win.document.documentElement
          });
          Object.defineProperty(win.document, 'mozFullScreenElement', {
            get: () => win.document.documentElement
          });
          Object.defineProperty(win.document, 'msFullscreenElement', {
            get: () => win.document.documentElement
          });
          
          // Mock screen properties
          Object.defineProperty(win.screen, 'width', { value: 1920 });
          Object.defineProperty(win.screen, 'height', { value: 1080 });
          Object.defineProperty(win.screen, 'availWidth', { value: 1920 });
          Object.defineProperty(win.screen, 'availHeight', { value: 1080 });
        }
      });
    }
    
    // Visit with enhanced fullscreen mocking
    visitWithFullscreenMocking(\`http://localhost:8080/?task=\${TASK_NAME}\`);

    // Take initial screenshot with timestamp
    cy.screenshot(\`\${timestamp}-\${TASK_NAME}-\${(++screenshotCounter).toString().padStart(3, '0')}-initial-load\`);
    cy.wait(3000);

    // Flexible task start - try multiple approaches
    cy.get('body').then((\$body) => {
      // Try to find and click OK/Start button, but don't require it
      if (\$body.find('button:contains("OK"), button:contains("Start"), button:contains("Begin"), button:contains("Continue"), button:contains("Get Started")').length > 0) {
        console.log('🎯 Found start button, clicking...');
        cy.contains('OK', 'Start', 'Begin', 'Continue', 'Get Started').first().click();
        cy.screenshot(\`\${timestamp}-\${TASK_NAME}-\${(++screenshotCounter).toString().padStart(3, '0')}-task-started\`);
      } else {
        console.log('⚡ No start button found, proceeding directly to task loop');
        cy.screenshot(\`\${timestamp}-\${TASK_NAME}-\${(++screenshotCounter).toString().padStart(3, '0')}-no-start-button\`);
      }
    });

    cy.wait(2000);

    // Main task loop with completion detection
    function taskLoopWithCompletion(stepNumber) {
      if (stepNumber > maxSteps || completionDetected) {
        console.log(\`🏁 Stopping: Step limit (\${maxSteps}) reached or completion detected\`);
        cy.screenshot(\`\${timestamp}-\${TASK_NAME}-\${(++screenshotCounter).toString().padStart(3, '0')}-final-state\`);
        return;
      }

      console.log(\`📸 Step \${stepNumber}/\${maxSteps} - Screenshot \${screenshotCounter}\`);

      // Wait for stimulus container or check for completion
      cy.get('body').then((\$body) => {
        // Check for task completion indicators
        if (\$body.find('footer').length > 0) {
          console.log('🏁 Task completed - found footer');
          completionDetected = true;
          cy.contains('Exit').click({ timeout: 60000 });
          cy.screenshot(\`\${timestamp}-\${TASK_NAME}-\${(++screenshotCounter).toString().padStart(3, '0')}-task-completed\`);
          return;
        }

        // Check if stimulus container exists
        if (\$body.find('.lev-stimulus-container').length > 0) {
          // Take screenshot of current state
          cy.screenshot(\`\${timestamp}-\${TASK_NAME}-\${(++screenshotCounter).toString().padStart(3, '0')}-step-\${stepNumber}\`);
          cy.wait(2000);
          
          // Handle interactions based on task type and available elements
          handleTaskInteractions(\$body, TASK_NAME);
          
          cy.wait(3000);
          
          // Continue to next step
          taskLoopWithCompletion(stepNumber + 1);
        } else {
          console.log('⏹️ No stimulus container found - task may be finished');
          cy.screenshot(\`\${timestamp}-\${TASK_NAME}-\${(++screenshotCounter).toString().padStart(3, '0')}-no-stimulus\`);
          
          // Try to continue anyway
          cy.wait(5000);
          taskLoopWithCompletion(stepNumber + 1);
        }
      });
    }

    function handleTaskInteractions(\$body, taskName) {
      cy.get('.jspsych-content').then((content) => {
        // Priority 1: Correct answer buttons (key insight from working tests)
        const correctButtons = content.find('.correct');
        const correctAriaButtons = content.find('[aria-label="correct"]');
        
        if (correctButtons.length > 0) {
          console.log('🎯 Clicking correct answer button');
          cy.get('.correct').first().click({ timeout: 30000 });
          return;
        }
        
        if (correctAriaButtons.length > 0) {
          console.log('🎯 Clicking correct aria-label button');
          cy.get('[aria-label="correct"]').first().click({ timeout: 30000 });
          return;
        }

        // Task-specific interactions
        if (taskName.includes('math') || taskName.includes('egma')) {
          handleMathInteractions(content);
        } else if (taskName.includes('theory') || taskName.includes('mind')) {
          handleTheoryOfMindInteractions(content);
        } else if (taskName.includes('memory')) {
          handleMemoryInteractions(content);
        } else if (taskName.includes('matrix') || taskName.includes('reasoning')) {
          handleMatrixInteractions(content);
        } else if (taskName.includes('hearts') || taskName.includes('flowers')) {
          handleHeartsFlowersInteractions(content);
        } else {
          handleGenericInteractions(content);
        }
      });
    }

    function handleMathInteractions(content) {
      const sliders = content.find('.jspsych-slider');
      const numberInputs = content.find('input[type="number"]');
      const textInputs = content.find('input[type="text"]');
      const primaryButtons = content.find('.primary');

      if (sliders.length > 0 && content.find('.secondary').length === 0) {
        console.log('🎚️ Handling math slider');
        cy.get('.jspsych-slider').click();
        cy.wait(1000);
        if (primaryButtons.length > 0) {
          cy.get('.primary').click();
        }
      } else if (numberInputs.length > 0) {
        console.log('🔢 Handling number input');
        const randomNumber = Math.floor(Math.random() * 20) + 1;
        cy.get('input[type="number"]').first().clear().type(randomNumber.toString());
        cy.wait(500);
        if (primaryButtons.length > 0) {
          cy.get('.primary').click();
        }
      } else if (textInputs.length > 0) {
        console.log('📝 Handling text input');
        cy.get('input[type="text"]').first().clear().type('5');
        cy.wait(500);
        if (primaryButtons.length > 0) {
          cy.get('.primary').click();
        }
      } else if (primaryButtons.length > 0) {
        console.log('▶️ Clicking primary button');
        cy.get('.primary').first().click();
      }
    }

    function handleTheoryOfMindInteractions(content) {
      const imageButtons = content.find('.image');
      const primaryButtons = content.find('.primary');

      if (imageButtons.length > 0) {
        console.log('🖼️ Clicking image button');
        cy.get('.image').first().click();
      } else if (primaryButtons.length > 0) {
        console.log('▶️ Clicking primary button');
        cy.get('.primary').first().click();
      }
    }

    function handleMemoryInteractions(content) {
      const cards = content.find('.card, .memory-card, [data-card]');
      const primaryButtons = content.find('.primary');

      if (cards.length > 0) {
        console.log('🃏 Clicking memory card');
        cy.get('.card, .memory-card, [data-card]').first().click();
      } else if (primaryButtons.length > 0) {
        console.log('▶️ Clicking primary button');
        cy.get('.primary').first().click();
      }
    }

    function handleMatrixInteractions(content) {
      const matrixButtons = content.find('.matrix-option, .option');
      const primaryButtons = content.find('.primary');

      if (matrixButtons.length > 0) {
        console.log('🔲 Clicking matrix option');
        cy.get('.matrix-option, .option').first().click();
      } else if (primaryButtons.length > 0) {
        console.log('▶️ Clicking primary button');
        cy.get('.primary').first().click();
      }
    }

    function handleHeartsFlowersInteractions(content) {
      const directionButtons = content.find('[data-direction], .direction');
      const primaryButtons = content.find('.primary');

      if (directionButtons.length > 0) {
        console.log('➡️ Clicking direction button');
        cy.get('[data-direction], .direction').first().click();
      } else if (primaryButtons.length > 0) {
        console.log('▶️ Clicking primary button');
        cy.get('.primary').first().click();
      }
    }

    function handleGenericInteractions(content) {
      const primaryButtons = content.find('.primary');
      const anyButton = content.find('button:visible:not([disabled])');

      if (primaryButtons.length > 0) {
        console.log('▶️ Clicking primary button');
        cy.get('.primary').first().click();
      } else if (anyButton.length > 0) {
        console.log('🔘 Clicking any available button');
        cy.get('button:visible:not([disabled])').first().click({ force: true });
      }
    }

    // Start the main task loop
    taskLoopWithCompletion(1);
  });
});
EOF

echo "⏳ Running Cypress test..."
echo "💡 Press Ctrl+C to stop the test at any time"
echo ""

# Run the test and capture output
npx cypress run --spec "cypress/e2e/temp_single_task.cy.js" --headless 2>&1 | tee "$LOG_FILE"

# Clean up temporary file
rm -f cypress/e2e/temp_single_task.cy.js

echo ""
echo "✅ Test completed!"
echo "📝 Full log saved to: $LOG_FILE"
echo "📸 Screenshots saved in: cypress/screenshots/"
echo ""
echo "🔍 To analyze screenshots with OCR:"
echo "cd .. && python3 cleanup_screenshots_ocr.py task-launcher/cypress/screenshots/temp_single_task.cy.js/" 