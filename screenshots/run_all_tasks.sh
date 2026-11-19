#!/bin/bash
# Comprehensive script to capture screenshots for all available tasks

echo "🎯 COMPREHENSIVE TASK SCREENSHOT CAPTURE"
echo "=================================================="

# Create timestamped backup directory for all results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="all_task_screenshots_$TIMESTAMP"
echo "📁 Results will be preserved in: $BACKUP_DIR"

# Task list from taskConfig.ts
TASKS=(
    "egma-math"
    "matrix-reasoning" 
    "mental-rotation"
    "hearts-and-flowers"
    "memory-game"
    "same-different-selection"
    "trog"
    "vocab"
    "theory-of-mind"
    "intro"
    "adult-reasoning"
)

# Start webpack dev server
echo "🚀 Starting webpack dev server..."
pkill -f "webpack serve" 2>/dev/null || true
pkill -f "port 8080" 2>/dev/null || true
sleep 2

npx webpack serve --mode development --env dbmode=development --port 8080 &
SERVER_PID=$!
echo "⏳ Waiting for dev server to start..."
sleep 15

# Function to create and run test for a task
run_task_test() {
    local task_name=$1
    local test_file="cypress/e2e-screenshot-scripts/${task_name//-/_}_complete.cy.js"
    
    echo ""
    echo "==================== ${task_name^^} ===================="
    echo "📸 Running screenshots for: $task_name"
    
    # Create Cypress test file
    cat > "$test_file" << EOF
const ${task_name//-/_}_url = 'http://localhost:8080/?task=${task_name}';

describe('${task_name^} Complete Run', () => {
  let screenshotCounter = 1;

  function takeScreenshot(description) {
    cy.screenshot(\`\${screenshotCounter.toString().padStart(3, '0')}-\${description}\`);
    screenshotCounter++;
  }

  it('runs complete ${task_name} with screenshots', () => {
    // Visit with fullscreen mocking and extended timeout
    cy.visit(${task_name//-/_}_url, {
      timeout: 60000,
      onBeforeLoad: (win) => {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
      }
    });

    // Initial screenshot
    takeScreenshot('initial-load');
    
    // Run for 8 minutes with screenshots every 10 seconds
    const totalDuration = 8 * 60 * 1000; // 8 minutes
    const screenshotInterval = 10 * 1000; // 10 seconds
    const numScreenshots = Math.floor(totalDuration / screenshotInterval);
    
    // Take screenshots at regular intervals
    for (let i = 1; i <= numScreenshots; i++) {
      cy.wait(screenshotInterval);
      takeScreenshot(\`interval-\${i.toString().padStart(2, '0')}\`);
      
      // Try to interact with common elements (non-blocking)
      cy.get('body').then((\$body) => {
        // Click OK buttons if they exist
        if (\$body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        }
        // Click Continue buttons if they exist  
        if (\$body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        }
        // Click Next buttons if they exist
        if (\$body.find('button:contains("Next")').length > 0) {
          cy.get('button:contains("Next")').first().click({ force: true });
        }
        // Click Start buttons if they exist
        if (\$body.find('button:contains("Start")').length > 0) {
          cy.get('button:contains("Start")').first().click({ force: true });
        }
        // Click any visible buttons as fallback
        if (\$body.find('button:visible').length > 0) {
          cy.get('button:visible').first().click({ force: true });
        }
      });
    }
    
    // Final screenshot
    takeScreenshot('final-state');
  });
});
EOF

    # Run Cypress test
    echo "🏃 Running Cypress test..."
    if timeout 600 npx cypress run --spec "$test_file" --record false; then
        echo "✅ $task_name screenshots completed"
        
        # Run OCR cleanup (preserves duplicates in backup folder)
        local screenshot_dir="cypress/screenshots/${task_name//-/_}_complete.cy.js"
        if [ -d "$screenshot_dir" ]; then
            echo "🔍 Running OCR cleanup for $task_name (duplicates preserved in backup)..."
            if python3 cleanup_screenshots_ocr.py "$screenshot_dir" --execute; then
                echo "✅ $task_name cleanup complete - unique screenshots kept, duplicates backed up"
            else
                echo "⚠️  $task_name cleanup had issues"
            fi
        else
            echo "⚠️  No screenshots found for $task_name"
        fi
    else
        echo "❌ $task_name test failed or timed out"
    fi
    
    sleep 3
}

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping dev server..."
    kill $SERVER_PID 2>/dev/null || true
    pkill -f "webpack serve" 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Run tests for all tasks
successful=0
failed=0

for task in "${TASKS[@]}"; do
    if run_task_test "$task"; then
        ((successful++))
    else
        ((failed++))
    fi
done

# Create comprehensive backup of all results
echo ""
echo "📦 Creating comprehensive backup..."
if [ -d "cypress/screenshots" ]; then
    cp -r cypress/screenshots "$BACKUP_DIR"
    echo "✅ All screenshots backed up to: $BACKUP_DIR"
else
    echo "⚠️  No screenshots directory found"
fi

# Final summary
echo ""
echo "=================================================="
echo "📊 FINAL SUMMARY REPORT"
echo "=================================================="
echo "✅ Successful tasks: $successful"
echo "❌ Failed tasks: $failed"
echo "📁 Complete backup: $BACKUP_DIR"
echo "🎉 Task screenshot capture complete!"

exit 0 