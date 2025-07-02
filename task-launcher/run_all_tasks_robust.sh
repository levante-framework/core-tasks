#!/bin/bash
# Robust comprehensive script to capture screenshots for all available tasks

echo "🎯 ROBUST COMPREHENSIVE TASK SCREENSHOT CAPTURE"
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
    "roar-inference"
    "adult-reasoning"
)

# Global variables
SERVER_PID=""
SERVER_ATTEMPTS=0
MAX_SERVER_ATTEMPTS=3

# Function to kill any existing servers
cleanup_servers() {
    echo "🧹 Cleaning up existing servers..."
    pkill -f "webpack serve" 2>/dev/null || true
    pkill -f "port 8080" 2>/dev/null || true
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 3
}

# Function to start webpack dev server with retries
start_dev_server() {
    local attempt=1
    
    while [ $attempt -le $MAX_SERVER_ATTEMPTS ]; do
        echo "🚀 Starting webpack dev server (attempt $attempt/$MAX_SERVER_ATTEMPTS)..."
        
        # Clean up any existing servers
        cleanup_servers
        
        # Start new server
        npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
        SERVER_PID=$!
        
        # Wait for server to start
        echo "⏳ Waiting for dev server to start..."
        sleep 20
        
        # Check if server is responding
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            echo "✅ Dev server started successfully on port 8080"
            return 0
        else
            echo "❌ Dev server failed to start (attempt $attempt)"
            kill $SERVER_PID 2>/dev/null || true
            ((attempt++))
            sleep 5
        fi
    done
    
    echo "💥 Failed to start dev server after $MAX_SERVER_ATTEMPTS attempts"
    return 1
}

# Function to check if server is still running
check_server() {
    if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo "⚠️  Server appears to be down, attempting restart..."
        start_dev_server
        return $?
    fi
    return 0
}

# Function to create and run test for a task
run_task_test() {
    local task_name=$1
    local test_file="cypress/e2e/${task_name//-/_}_complete.cy.js"
    
    echo ""
    echo "==================== ${task_name^^} ===================="
    echo "📸 Running screenshots for: $task_name"
    
    # Check server before starting test
    if ! check_server; then
        echo "❌ Cannot start test - server is not available"
        return 1
    fi
    
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

    # Run Cypress test with retries
    local test_attempts=0
    local max_test_attempts=2
    
    while [ $test_attempts -lt $max_test_attempts ]; do
        echo "🏃 Running Cypress test (attempt $((test_attempts + 1))/$max_test_attempts)..."
        
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
            return 0
        else
            echo "⚠️  $task_name test failed (attempt $((test_attempts + 1)))"
            ((test_attempts++))
            
            # Check if server is still running after failure
            if [ $test_attempts -lt $max_test_attempts ]; then
                echo "🔄 Checking server status before retry..."
                check_server
                sleep 5
            fi
        fi
    done
    
    echo "❌ $task_name test failed after $max_test_attempts attempts"
    return 1
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

# Run tests for all tasks
successful=0
failed=0

for task in "${TASKS[@]}"; do
    if run_task_test "$task"; then
        ((successful++))
    else
        ((failed++))
    fi
    
    # Small delay between tasks
    sleep 5
    
    # Periodic server health check
    if ! check_server; then
        echo "💥 Server health check failed. Stopping."
        break
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
echo "🎉 Robust task screenshot capture complete!"

exit 0 