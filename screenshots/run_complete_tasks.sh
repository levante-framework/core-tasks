#!/bin/bash

# Complete Task Screenshot Capture - Reliable Version
set -e

TASKS=("memory-game" "egma-math" "matrix-reasoning" "adult-reasoning")
SERVER_PORT=8080

echo "🚀 Complete Task Screenshot Capture"
echo "📊 Testing with ${#TASKS[@]} tasks first"

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up..."
    pkill -f "webpack" 2>/dev/null || true
    pkill -f "cypress" 2>/dev/null || true
    lsof -ti:${SERVER_PORT} | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Start server
start_server() {
    echo "🚀 Starting server..."
    npx webpack serve --mode development --env dbmode=development --port ${SERVER_PORT} > webpack.log 2>&1 &
    
    for i in {1..20}; do
        if curl -s http://localhost:${SERVER_PORT} > /dev/null 2>&1; then
            echo "✅ Server ready"
            return 0
        fi
        sleep 2
    done
    return 1
}

# Test single task first
test_single_task() {
    local task=$1
    echo ""
    echo "🎯 Testing: $task"
    
    cat > "cypress/e2e-screenshot-scripts/test_${task}.cy.js" << 'EOF'
describe('TASK_PLACEHOLDER Complete Run', () => {
  it('runs complete task with screenshots', () => {
    cy.visit('http://localhost:8080/?task=TASK_PLACEHOLDER', { timeout: 60000 });
    
    // Mock fullscreen
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    let counter = 0;
    
    // Initial screenshot
    cy.screenshot(`${String(counter++).padStart(2, '0')}-start`);
    cy.wait(2000);
    
    // Start task
    cy.get('body').then($body => {
      if ($body.find('button:contains("OK")').length > 0) {
        cy.get('button:contains("OK")').first().click({ force: true });
        cy.screenshot(`${String(counter++).padStart(2, '0')}-clicked-ok`);
      }
    });
    
    // Main loop - run for reasonable time taking screenshots
    for (let i = 0; i < 20; i++) {
      cy.wait(8000);
      cy.screenshot(`${String(counter++).padStart(2, '0')}-step-${i}`);
      
      // Check if completed
      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        if (text.includes('thank you') || text.includes('complete') || text.includes('exit')) {
          return; // Done
        }
        
        // Continue interacting
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if ($body.find('.jspsych-corsi-block').length > 0) {
          cy.get('.jspsych-corsi-block').then($blocks => {
            cy.wrap($blocks[Math.floor(Math.random() * $blocks.length)]).click({ force: true });
          });
        } else if ($body.find('#jspsych-html-multi-response-btngroup button').length > 0) {
          cy.get('#jspsych-html-multi-response-btngroup button').then($buttons => {
            cy.wrap($buttons[Math.floor(Math.random() * $buttons.length)]).click({ force: true });
          });
        } else if ($body.find('button').length > 0) {
          cy.get('button').first().click({ force: true });
        }
      });
    }
    
    cy.screenshot(`${String(counter++).padStart(2, '0')}-final`);
  });
});
EOF
    
    # Replace placeholder with actual task name
    sed -i "s/TASK_PLACEHOLDER/$task/g" "cypress/e2e-screenshot-scripts/test_${task}.cy.js"
    
    # Run test
    echo "🚀 Running $task test..."
    if npx cypress run --spec "cypress/e2e-screenshot-scripts/test_${task}.cy.js" --headless --config defaultCommandTimeout=30000; then
        echo "✅ $task completed"
        
        # Check results
        local dir="cypress/screenshots/test_${task}.cy.js"
        if [ -d "$dir" ]; then
            local count=$(ls -1 "$dir"/*.png 2>/dev/null | wc -l)
            echo "📸 Captured $count screenshots"
            
            # Show some file sizes
            echo "📊 Sample sizes:"
            ls -lah "$dir"/*.png | head -5 | awk '{print "   " $5 " - " $9}'
            
            # Run OCR cleanup
            echo "🔍 Running OCR cleanup..."
            python3 cleanup_screenshots_ocr.py "$dir/" --execute || echo "⚠️ OCR cleanup failed"
        fi
    else
        echo "❌ $task failed"
    fi
    
    # Cleanup test file
    rm -f "cypress/e2e-screenshot-scripts/test_${task}.cy.js"
}

# Main execution
cleanup
if ! start_server; then
    echo "❌ Server failed to start"
    exit 1
fi

# Test each task
for task in "${TASKS[@]}"; do
    test_single_task "$task"
    sleep 2
done

cleanup
echo "🎉 Complete task testing finished!" 