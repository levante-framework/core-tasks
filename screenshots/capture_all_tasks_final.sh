#!/bin/bash
# Final comprehensive script to capture screenshots for all 12 tasks

echo "🎯 COMPREHENSIVE TASK SCREENSHOT CAPTURE"
echo "========================================"

# Create timestamped backup directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="all_tasks_final_$TIMESTAMP"
echo "📁 Results will be preserved in: $BACKUP_DIR"

# All 12 tasks
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
successful=0
failed=0

# Function to start webpack dev server
start_server() {
    echo "🚀 Starting webpack dev server..."
    
    # Kill any existing servers
    pkill -f "webpack serve" 2>/dev/null || true
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 3
    
    # Start new server
    npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server
    echo "⏳ Waiting for server to start..."
    sleep 15
    
    # Check if server is running
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo "✅ Server is running on port 8080"
        return 0
    else
        echo "❌ Server failed to start"
        return 1
    fi
}

# Function to capture screenshots for a task
capture_task() {
    local task_name=$1
    local test_file="cypress/e2e-screenshot-scripts/${task_name//-/_}_capture.cy.js"
    
    echo ""
    echo "==================== ${task_name^^} ===================="
    echo "📸 Capturing screenshots for: $task_name"
    
    # Create Cypress test file
    mkdir -p cypress/e2e
    cat > "$test_file" << EOF
describe('${task_name^} Screenshot Capture', () => {
  it('captures screenshots from ${task_name}', () => {
    // Visit with fullscreen mocking
    cy.visit('http://localhost:8080/?task=${task_name}', {
      timeout: 30000,
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

    // Take initial screenshot
    cy.screenshot('01-initial-load');
    cy.wait(5000);

    // Take screenshots every 10 seconds for 2 minutes (12 screenshots)
    for (let i = 1; i <= 12; i++) {
      cy.wait(10000);
      cy.screenshot(\`\${(i+1).toString().padStart(2, '0')}-interval-\${i}\`);
      
      // Try to interact with common elements
      cy.get('body').then((\$body) => {
        if (\$body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if (\$body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if (\$body.find('button:contains("Start")').length > 0) {
          cy.get('button:contains("Start")').first().click({ force: true });
        } else if (\$body.find('button:contains("Next")').length > 0) {
          cy.get('button:contains("Next")').first().click({ force: true });
        } else if (\$body.find('button:visible').length > 0) {
          cy.get('button:visible').first().click({ force: true });
        }
      });
    }

    // Final screenshot
    cy.screenshot('14-final');
  });
});
EOF

    # Run Cypress test with timeout
    echo "🏃 Running Cypress test for $task_name..."
    if timeout 180 npx cypress run --spec "$test_file" --record false; then
        echo "✅ $task_name completed successfully"
        
        # Check screenshots
        local screenshot_dir="cypress/screenshots/${task_name//-/_}_capture.cy.js"
        if [ -d "$screenshot_dir" ]; then
            local count=$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
            echo "📸 Captured $count screenshots for $task_name"
        fi
        
        return 0
    else
        echo "❌ $task_name failed or timed out"
        return 1
    fi
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

# Start the dev server
if ! start_server; then
    echo "💥 Cannot start dev server. Exiting."
    exit 1
fi

# Run screenshot capture for all tasks
echo ""
echo "🚀 Starting screenshot capture for all tasks..."

for task in "${TASKS[@]}"; do
    if capture_task "$task"; then
        ((successful++))
    else
        ((failed++))
        
        # Try to restart server if it failed
        echo "🔄 Attempting to restart server..."
        if ! start_server; then
            echo "💥 Server restart failed. Stopping."
            break
        fi
    fi
    
    # Small delay between tasks
    sleep 2
done

# Create comprehensive backup
echo ""
echo "📦 Creating comprehensive backup..."
if [ -d "cypress/screenshots" ]; then
    cp -r cypress/screenshots "$BACKUP_DIR"
    echo "✅ All screenshots backed up to: $BACKUP_DIR"
    
    # Count total screenshots
    total_screenshots=$(find "$BACKUP_DIR" -name "*.png" | wc -l)
    echo "📊 Total screenshots captured: $total_screenshots"
fi

# Final summary
echo ""
echo "=================================================="
echo "📊 FINAL COMPREHENSIVE SUMMARY"
echo "=================================================="
echo "✅ Successful tasks: $successful"
echo "❌ Failed tasks: $failed"
echo "📁 Backup directory: $BACKUP_DIR"
echo "🎉 Comprehensive task screenshot capture complete!"

# Show breakdown by task
echo ""
echo "📋 Task Breakdown:"
for task in "${TASKS[@]}"; do
    screenshot_dir="cypress/screenshots/${task//-/_}_capture.cy.js"
    if [ -d "$screenshot_dir" ]; then
        count=$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
        echo "  $task: $count screenshots"
    else
        echo "  $task: 0 screenshots (failed)"
    fi
done

exit 0 