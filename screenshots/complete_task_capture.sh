#!/bin/bash

# Complete Task Capture Script - Ensures full task completion
# Takes screenshots throughout entire task lifecycle

set -e

# Configuration
TASKS=("memory-game" "egma-math" "matrix-reasoning" "mental-rotation" "hearts-and-flowers" "same-different-selection" "trog" "vocab" "theory-of-mind" "intro" "roar-inference" "adult-reasoning")
SERVER_PORT=8080
BACKUP_DIR="complete_tasks_screenshots_$(date +%Y%m%d_%H%M%S)"
MAX_TASK_DURATION=600  # 10 minutes max per task

echo "🚀 Complete Task Screenshot Capture"
echo "📊 Configuration:"
echo "   - Tasks: ${#TASKS[@]}"
echo "   - Max duration per task: ${MAX_TASK_DURATION}s"
echo "   - Server port: ${SERVER_PORT}"
echo ""

# Function to cleanup processes
cleanup_processes() {
    echo "🧹 Cleaning up processes..."
    pkill -f "webpack" 2>/dev/null || true
    pkill -f "cypress" 2>/dev/null || true
    lsof -ti:${SERVER_PORT} | xargs kill -9 2>/dev/null || true
    sleep 3
}

# Function to start server
start_server() {
    echo "🚀 Starting webpack server on port ${SERVER_PORT}..."
    npx webpack serve --mode development --env dbmode=development --port ${SERVER_PORT} > webpack.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:${SERVER_PORT} > /dev/null 2>&1; then
            echo "✅ Server is ready"
            return 0
        fi
        sleep 2
    done
    
    echo "❌ Server failed to start"
    return 1
}

# Function to create complete task test
create_complete_task_test() {
    local task_name=$1
    local test_file="cypress/e2e-screenshot-scripts/${task_name}_complete.cy.js"
    
    cat > "${test_file}" << EOF
describe('${task_name} Complete Capture', () => {
  it('captures screenshots throughout complete ${task_name} run', () => {
    cy.visit('http://localhost:${SERVER_PORT}/?task=${task_name}', {
      timeout: 60000
    });
    
    // Mock fullscreen API
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    // Initial screenshot
    cy.screenshot('00-initial-load');
    cy.wait(2000);
    
    // Start the task
    cy.get('body').then((\$body) => {
      if (\$body.find('button:contains("OK")').length > 0) {
        cy.get('button:contains("OK")').first().click({ force: true });
        cy.screenshot('01-after-ok');
      } else if (\$body.find('button:contains("Start")').length > 0) {
        cy.get('button:contains("Start")').first().click({ force: true });
        cy.screenshot('01-after-start');
      }
    });
    
    cy.wait(3000);
    cy.screenshot('02-task-started');
    
    // Main task loop - continue until completion
    let screenshotCounter = 3;
    
    // Run task completion loop
    const runTaskLoop = () => {
      // Check for completion first
      cy.get('body').then((\$body) => {
        const bodyText = \$body.text().toLowerCase();
        
        if (bodyText.includes('thank you') || 
            bodyText.includes('complete') || 
            bodyText.includes('finished') ||
            bodyText.includes('done') ||
            bodyText.includes('exit')) {
          cy.screenshot(\`\${String(screenshotCounter).padStart(2, '0')}-completion\`);
          return; // Task completed
        } else {
          // Task still running - take screenshot and continue
          cy.screenshot(\`\${String(screenshotCounter).padStart(2, '0')}-progress\`);
          screenshotCounter++;
          
          // Interact with current screen
          cy.get('body').then((\$currentBody) => {
            // Handle different interaction types
            if (\$currentBody.find('button:contains("OK")').length > 0) {
              cy.get('button:contains("OK")').first().click({ force: true });
            } else if (\$currentBody.find('button:contains("Continue")').length > 0) {
              cy.get('button:contains("Continue")').first().click({ force: true });
            } else if (\$currentBody.find('button:contains("Next")').length > 0) {
              cy.get('button:contains("Next")').first().click({ force: true });
            }
            // Memory game blocks
            else if (\$currentBody.find('.jspsych-corsi-block').length > 0) {
              cy.get('.jspsych-corsi-block').then(\$blocks => {
                const randomIndex = Math.floor(Math.random() * \$blocks.length);
                cy.wrap(\$blocks[randomIndex]).click({ force: true });
              });
            }
            // Multiple choice buttons
            else if (\$currentBody.find('#jspsych-html-multi-response-btngroup button').length > 0) {
              cy.get('#jspsych-html-multi-response-btngroup button').then(\$buttons => {
                const randomIndex = Math.floor(Math.random() * \$buttons.length);
                cy.wrap(\$buttons[randomIndex]).click({ force: true });
              });
            }
            // Any other buttons
            else if (\$currentBody.find('button').length > 0) {
              cy.get('button').then(\$buttons => {
                const visibleButtons = \$buttons.filter(':visible');
                if (visibleButtons.length > 0) {
                  const randomIndex = Math.floor(Math.random() * visibleButtons.length);
                  cy.wrap(visibleButtons[randomIndex]).click({ force: true });
                }
              });
            }
          });
          
          // Wait and continue loop
          cy.wait(5000);
          
          // Recursive call to continue loop (with max depth protection)
          if (screenshotCounter < 50) { // Max 50 screenshots per task
            runTaskLoop();
          }
        }
      });
    };
    
    // Start the main task loop
    runTaskLoop();
    
    // Final screenshot
    cy.screenshot('99-final');
  });
});
EOF
    
    echo "✅ Created complete test file: ${test_file}"
}

# Function to run complete task capture
run_complete_task_capture() {
    local task_name=$1
    echo ""
    echo "🎯 Processing complete task: ${task_name}"
    
    # Create complete task test
    create_complete_task_test "${task_name}"
    
    # Run Cypress test with extended timeout
    echo "🚀 Running complete Cypress test..."
    if timeout ${MAX_TASK_DURATION} npx cypress run --spec "cypress/e2e-screenshot-scripts/${task_name}_complete.cy.js" --headless --config defaultCommandTimeout=30000,requestTimeout=30000,responseTimeout=30000,taskTimeout=${MAX_TASK_DURATION}000; then
        echo "✅ ${task_name} complete capture finished"
        
        # Check results
        local screenshot_dir="cypress/screenshots/${task_name}_complete.cy.js"
        if [ -d "\${screenshot_dir}" ]; then
            local count=\$(ls -1 "\${screenshot_dir}"/*.png 2>/dev/null | wc -l)
            echo "📸 Captured \${count} screenshots for complete ${task_name} run"
            
            # Show file sizes to verify content variety
            echo "📊 Screenshot sizes:"
            ls -lah "\${screenshot_dir}"/*.png | awk '{print "   " \$5 " - " \$9}' | head -10
            if [ \$count -gt 10 ]; then
                echo "   ... and \$((count - 10)) more"
            fi
            
            # Run OCR cleanup
            echo "🔍 Running OCR cleanup..."
            if python3 cleanup_screenshots_ocr.py "\${screenshot_dir}/" --execute; then
                local remaining=\$(ls -1 "\${screenshot_dir}"/*.png 2>/dev/null | wc -l)
                echo "✨ OCR cleanup complete: \${remaining} unique screenshots retained"
            else
                echo "⚠️  OCR cleanup failed, keeping all screenshots"
            fi
        else
            echo "⚠️  No screenshots found for ${task_name}"
        fi
    else
        echo "❌ ${task_name} capture failed or timed out"
    fi
    
    # Clean up test file
    rm -f "cypress/e2e-screenshot-scripts/${task_name}_complete.cy.js"
}

# Main execution
echo "🧹 Initial cleanup..."
cleanup_processes

# Start server
if ! start_server; then
    echo "❌ Failed to start server. Exiting."
    exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Process each task
for task in "\${TASKS[@]}"; do
    run_complete_task_capture "\${task}"
    
    # Copy results to backup
    if [ -d "cypress/screenshots/\${task}_complete.cy.js" ]; then
        cp -r "cypress/screenshots/\${task}_complete.cy.js" "\${BACKUP_DIR}/"
        echo "💾 Backed up \${task} results to \${BACKUP_DIR}/"
    fi
    
    # Brief pause between tasks
    sleep 3
done

# Final cleanup
echo ""
echo "🧹 Final cleanup..."
cleanup_processes

# Summary
echo ""
echo "🎉 ALL COMPLETE TASKS FINISHED!"
echo "📁 Results backed up to: \${BACKUP_DIR}/"
echo "📊 Summary:"
for task in "\${TASKS[@]}"; do
    if [ -d "cypress/screenshots/\${task}_complete.cy.js" ]; then
        local unique_count=\$(ls -1 "cypress/screenshots/\${task}_complete.cy.js"/*.png 2>/dev/null | wc -l)
        local backup_count=0
        if [ -d "cypress/screenshots/\${task}_complete.cy.js/duplicates_backup" ]; then
            backup_count=\$(ls -1 "cypress/screenshots/\${task}_complete.cy.js/duplicates_backup"/*.png 2>/dev/null | wc -l)
        fi
        echo "   \${task}: \${unique_count} unique screenshots (\${backup_count} duplicates in backup)"
    else
        echo "   \${task}: No screenshots captured"
    fi
done

echo ""
echo "✅ Complete task screenshot capture finished for all \${#TASKS[@]} tasks!" 