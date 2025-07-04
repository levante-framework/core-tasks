#!/bin/bash

# Robust All Tasks Screenshot Capture Script
# Based on successful memory-game approach

set -e

# Configuration
TASKS=("egma-math" "matrix-reasoning" "mental-rotation" "hearts-and-flowers" "memory-game" "same-different-selection" "trog" "vocab" "theory-of-mind" "intro" "roar-inference" "adult-reasoning")
CAPTURE_DURATION=120  # 2 minutes per task
SCREENSHOT_INTERVAL=10  # 10 seconds between screenshots
TOTAL_SCREENSHOTS=12  # 12 screenshots per task
SERVER_PORT=8080
BACKUP_DIR="all_tasks_screenshots_$(date +%Y%m%d_%H%M%S)"

echo "🚀 Starting comprehensive task screenshot capture"
echo "📊 Configuration:"
echo "   - Tasks: ${#TASKS[@]}"
echo "   - Duration per task: ${CAPTURE_DURATION}s"
echo "   - Screenshots per task: ${TOTAL_SCREENSHOTS}"
echo "   - Total estimated time: $((${#TASKS[@]} * (CAPTURE_DURATION + 60) / 60)) minutes"
echo ""

# Function to cleanup processes
cleanup_processes() {
    echo "🧹 Cleaning up processes..."
    pkill -f "webpack" 2>/dev/null || true
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

# Function to create task-specific test
create_task_test() {
    local task_name=$1
    local test_file="cypress/e2e-screenshot-scripts/${task_name}_capture.cy.js"
    
    cat > "${test_file}" << EOF
describe('${task_name} Screenshot Capture', () => {
  it('captures varied screenshots from ${task_name}', () => {
    cy.visit('http://localhost:${SERVER_PORT}/?task=${task_name}');
    
    // Mock fullscreen API
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    // Initial screenshot
    cy.screenshot('01-initial-load');
    
    // Wait and try to start the task
    cy.wait(3000);
    cy.get('body').then((\$body) => {
      if (\$body.find('button:contains("OK")').length > 0) {
        cy.get('button:contains("OK")').first().click({ force: true });
      } else if (\$body.find('button:contains("Start")').length > 0) {
        cy.get('button:contains("Start")').first().click({ force: true });
      } else if (\$body.find('button:contains("Continue")').length > 0) {
        cy.get('button:contains("Continue")').first().click({ force: true });
      }
    });
    cy.screenshot('02-after-start');
    
    // Take screenshots every ${SCREENSHOT_INTERVAL} seconds with smart interactions
    for (let i = 1; i <= ${TOTAL_SCREENSHOTS}; i++) {
      cy.wait(${SCREENSHOT_INTERVAL}000);
      
      // Smart interaction logic for different task types
      cy.get('body').then((\$body) => {
        // Standard buttons
        if (\$body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if (\$body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if (\$body.find('button:contains("Next")').length > 0) {
          cy.get('button:contains("Next")').first().click({ force: true });
        }
        // Memory game blocks
        else if (\$body.find('.jspsych-corsi-block').length > 0) {
          cy.get('.jspsych-corsi-block').then(\$blocks => {
            const randomIndex = Math.floor(Math.random() * \$blocks.length);
            cy.wrap(\$blocks[randomIndex]).click({ force: true });
          });
        }
        // Multiple choice buttons (adult-reasoning, etc.)
        else if (\$body.find('#jspsych-html-multi-response-btngroup button').length > 0) {
          cy.get('#jspsych-html-multi-response-btngroup button').then(\$buttons => {
            const randomIndex = Math.floor(Math.random() * \$buttons.length);
            cy.wrap(\$buttons[randomIndex]).click({ force: true });
          });
        }
        // Generic buttons
        else if (\$body.find('button').length > 0) {
          cy.get('button').then(\$buttons => {
            const randomIndex = Math.floor(Math.random() * \$buttons.length);
            cy.wrap(\$buttons[randomIndex]).click({ force: true });
          });
        }
        // Clickable elements
        else if (\$body.find('[onclick]').length > 0) {
          cy.get('[onclick]').first().click({ force: true });
        }
      });
      
      cy.screenshot(\`\${String(i + 2).padStart(2, '0')}-interval-\${i}\`);
    }
    
    // Final screenshot
    cy.screenshot(\`\${String(${TOTAL_SCREENSHOTS} + 3).padStart(2, '0')}-final\`);
  });
});
EOF
    
    echo "✅ Created test file: ${test_file}"
}

# Function to run task capture
run_task_capture() {
    local task_name=$1
    echo ""
    echo "🎯 Processing task: ${task_name}"
    echo "⏱️  Duration: ${CAPTURE_DURATION}s"
    
    # Create task-specific test
    create_task_test "${task_name}"
    
    # Run Cypress test
    echo "🚀 Running Cypress test..."
    if npx cypress run --spec "cypress/e2e-screenshot-scripts/${task_name}_capture.cy.js" --headless --config defaultCommandTimeout=60000,requestTimeout=60000,responseTimeout=60000; then
        echo "✅ ${task_name} capture completed successfully"
        
        # Check screenshot results
        local screenshot_dir="cypress/screenshots/${task_name}_capture.cy.js"
        if [ -d "${screenshot_dir}" ]; then
            local count=$(ls -1 "${screenshot_dir}"/*.png 2>/dev/null | wc -l)
            echo "📸 Captured ${count} screenshots"
            
            # Run OCR cleanup
            echo "🔍 Running OCR cleanup..."
            if python3 cleanup_screenshots_ocr.py "${screenshot_dir}/" --execute; then
                local remaining=$(ls -1 "${screenshot_dir}"/*.png 2>/dev/null | wc -l)
                echo "✨ OCR cleanup complete: ${remaining} unique screenshots retained"
            else
                echo "⚠️  OCR cleanup failed, keeping all screenshots"
            fi
        else
            echo "⚠️  No screenshots found for ${task_name}"
        fi
    else
        echo "❌ ${task_name} capture failed"
    fi
    
    # Clean up test file
    rm -f "cypress/e2e-screenshot-scripts/${task_name}_capture.cy.js"
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
for task in "${TASKS[@]}"; do
    run_task_capture "${task}"
    
    # Copy results to backup
    if [ -d "cypress/screenshots/${task}_capture.cy.js" ]; then
        cp -r "cypress/screenshots/${task}_capture.cy.js" "${BACKUP_DIR}/"
        echo "💾 Backed up ${task} results to ${BACKUP_DIR}/"
    fi
    
    # Brief pause between tasks
    sleep 5
done

# Final cleanup
echo ""
echo "🧹 Final cleanup..."
cleanup_processes

# Summary
echo ""
echo "🎉 ALL TASKS COMPLETED!"
echo "📁 Results backed up to: ${BACKUP_DIR}/"
echo "📊 Summary:"
for task in "${TASKS[@]}"; do
    if [ -d "cypress/screenshots/${task}_capture.cy.js" ]; then
        local unique_count=$(ls -1 "cypress/screenshots/${task}_capture.cy.js"/*.png 2>/dev/null | wc -l)
        local backup_count=$(ls -1 "cypress/screenshots/${task}_capture.cy.js/duplicates_backup"/*.png 2>/dev/null | wc -l)
        echo "   ${task}: ${unique_count} unique screenshots (${backup_count} duplicates in backup)"
    else
        echo "   ${task}: No screenshots captured"
    fi
done

echo ""
echo "✅ Screenshot capture complete for all ${#TASKS[@]} tasks!" 