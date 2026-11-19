#!/bin/bash
# Continue with remaining tasks after egma-math

echo "🔄 CONTINUING REMAINING TASKS"
echo "================================"

# Create timestamped backup directory for all results
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="remaining_tasks_$TIMESTAMP"
echo "📁 Results will be preserved in: $BACKUP_DIR"

# Remaining tasks (excluding egma-math which already has 44 screenshots)
TASKS=(
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

# Global variables
SERVER_PID=""

# Function to kill any existing servers
cleanup_servers() {
    echo "🧹 Cleaning up existing servers..."
    pkill -f "webpack serve" 2>/dev/null || true
    pkill -f "port 8080" 2>/dev/null || true
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 3
}

# Function to start webpack dev server
start_dev_server() {
    echo "🚀 Starting webpack dev server..."
    cleanup_servers
    
    npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
    SERVER_PID=$!
    
    echo "⏳ Waiting for dev server to start..."
    sleep 15
    
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo "✅ Dev server started successfully on port 8080"
        return 0
    else
        echo "❌ Dev server failed to start"
        return 1
    fi
}

# Function to create and run test for a task
run_task_test() {
    local task_name=$1
    local test_file="cypress/e2e-screenshot-scripts/${task_name//-/_}_complete.cy.js"
    
    echo ""
    echo "==================== ${task_name^^} ===================="
    echo "📸 Running screenshots for: $task_name"
    
    # Create Cypress test file with shorter 3-minute duration
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
    
    // Run for 3 minutes with screenshots every 10 seconds
    const totalDuration = 3 * 60 * 1000; // 3 minutes
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
    if timeout 300 npx cypress run --spec "$test_file" --record false; then
        echo "✅ $task_name screenshots completed"
        
        # Run OCR cleanup (preserves duplicates in backup folder)
        local screenshot_dir="cypress/screenshots/${task_name//-/_}_complete.cy.js"
        if [ -d "$screenshot_dir" ]; then
            echo "🔍 Running OCR cleanup for $task_name..."
            if python3 ../cleanup_screenshots_ocr.py "$screenshot_dir" --execute; then
                echo "✅ $task_name cleanup complete"
            else
                echo "⚠️  $task_name cleanup had issues (continuing anyway)"
            fi
        fi
        return 0
    else
        echo "❌ $task_name test failed"
        return 1
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping dev server..."
    kill $SERVER_PID 2>/dev/null || true
    cleanup_servers
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start the dev server
if ! start_dev_server; then
    echo "💥 Cannot start dev server. Exiting."
    exit 1
fi

# Run tests for remaining tasks
successful=0
failed=0

for task in "${TASKS[@]}"; do
    if run_task_test "$task"; then
        ((successful++))
    else
        ((failed++))
    fi
    
    # Small delay between tasks
    sleep 3
done

# Create comprehensive backup of all results
echo ""
echo "📦 Creating comprehensive backup..."
if [ -d "cypress/screenshots" ]; then
    cp -r cypress/screenshots "$BACKUP_DIR"
    echo "✅ All screenshots backed up to: $BACKUP_DIR"
fi

# Final summary
echo ""
echo "=================================================="
echo "📊 CONTINUATION SUMMARY REPORT"
echo "=================================================="
echo "✅ Successful tasks: $successful"
echo "❌ Failed tasks: $failed"
echo "📁 Backup directory: $BACKUP_DIR"
echo "📋 Note: egma-math already completed with 44 screenshots"
echo "🎉 Remaining task screenshot capture complete!"

exit 0 