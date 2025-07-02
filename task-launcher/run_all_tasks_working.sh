#!/bin/bash

# Comprehensive Task Screenshot Capture - Working Version
# Captures screenshots from all 12 tasks with OCR cleanup

# Configuration
TASKS=("hearts-and-flowers" "egma-math" "matrix-reasoning" "mental-rotation" "memory-game" "same-different-selection" "trog" "vocab" "theory-of-mind" "intro" "roar-inference" "adult-reasoning")
SCREENSHOT_INTERVAL=8  # seconds between screenshots
TASK_DURATION=180      # 3 minutes per task
WEBPACK_PORT=8080
BASE_URL="http://localhost:${WEBPACK_PORT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if server is ready
wait_for_server() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    log "Waiting for server to be ready at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            success "Server is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "Server failed to start after $max_attempts attempts"
    return 1
}

# Function to generate Cypress test for a task
generate_cypress_test() {
    local task_name=$1
    local test_file="cypress/e2e/${task_name}_working_capture.cy.js"
    
    cat > "$test_file" << EOF
describe('Task Screenshot Capture - ${task_name}', () => {
  it('should capture screenshots with smart interactions', () => {
    // Mock fullscreen API to prevent errors
    cy.visit('${BASE_URL}/?task=${task_name}', {
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement,
          configurable: true
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true,
          configurable: true
        });
      }
    });

    // Take initial screenshot
    cy.screenshot('00-start');
    
    // Wait for initial load
    cy.wait(3000);
    
    // Capture screenshots at regular intervals with interactions
    for (let i = 0; i < Math.floor(${TASK_DURATION} / ${SCREENSHOT_INTERVAL}); i++) {
      // Smart interaction logic
      cy.get('body').then((\$body) => {
        // Try to click various common interactive elements
        const selectors = [
          'button:contains("OK")',
          'button:contains("Continue")',
          'button:contains("Next")',
          'button:contains("Start")',
          'button:contains("Begin")',
          '.jspsych-btn',
          'button[type="button"]',
          '.btn',
          '[role="button"]',
          'input[type="button"]',
          'input[type="submit"]',
          '.corsi-block',
          '.afc-stimulus button',
          '.response-button',
          'button'
        ];
        
        // Try each selector until we find clickable elements
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
        
        // If no specific buttons, try random clicking
        if (!clicked) {
          cy.get('body').click(500, 300, { force: true });
        }
      });
      
      // Wait for the interval
      cy.wait(${SCREENSHOT_INTERVAL} * 1000);
      
      // Take screenshot
      cy.screenshot(\`\${String(i + 1).padStart(2, '0')}-step-\${i}\`);
    }
    
    // Final screenshot
    cy.screenshot('99-final');
  });
});
EOF
    
    success "Generated test file: $test_file"
}

# Function to run OCR cleanup
run_ocr_cleanup() {
    local task_name=$1
    local screenshot_dir="cypress/screenshots/${task_name}_working_capture.cy.js"
    
    if [ -d "$screenshot_dir" ]; then
        log "Running OCR cleanup for $task_name..."
        if python3 cleanup_screenshots_ocr.py "$screenshot_dir" --execute; then
            success "OCR cleanup completed for $task_name"
            
            # Count results
            local total_screenshots=$(find "$screenshot_dir" -name "*.png" -not -path "*/duplicates_backup/*" | wc -l)
            local backup_screenshots=0
            if [ -d "$screenshot_dir/duplicates_backup" ]; then
                backup_screenshots=$(find "$screenshot_dir/duplicates_backup" -name "*.png" | wc -l)
            fi
            local original_total=$((total_screenshots + backup_screenshots))
            
            success "Task $task_name: $original_total total → $total_screenshots unique ($backup_screenshots duplicates moved to backup)"
        else
            warning "OCR cleanup failed for $task_name, keeping all screenshots"
        fi
    else
        warning "No screenshots found for $task_name"
    fi
}

# Function to create timestamped backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="all_tasks_working_$timestamp"
    
    log "Creating comprehensive backup: $backup_dir"
    mkdir -p "$backup_dir"
    
    # Copy all task screenshot directories
    if [ -d "cypress/screenshots" ]; then
        cp -r cypress/screenshots/* "$backup_dir/" 2>/dev/null || true
    fi
    
    success "Backup created: $backup_dir"
}

# Cleanup function
cleanup() {
    log "Cleanup initiated..."
    if [ ! -z "$WEBPACK_PID" ]; then
        kill $WEBPACK_PID 2>/dev/null || true
    fi
    pkill -f "webpack serve" 2>/dev/null || true
    log "Cleanup completed"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Main execution
log "Starting comprehensive task screenshot capture (working version)"
log "Tasks to capture: ${TASKS[*]}"
log "Screenshot interval: ${SCREENSHOT_INTERVAL}s, Task duration: ${TASK_DURATION}s"

# Start webpack dev server
log "Starting webpack dev server on port $WEBPACK_PORT..."
npx webpack serve --mode development --env dbmode=development --port $WEBPACK_PORT > webpack.log 2>&1 &
WEBPACK_PID=$!

# Wait for server to be ready
if ! wait_for_server "$BASE_URL"; then
    error "Failed to start webpack server"
    kill $WEBPACK_PID 2>/dev/null || true
    exit 1
fi

# Process each task
task_count=0
total_tasks=${#TASKS[@]}

for task in "${TASKS[@]}"; do
    ((task_count++))
    log "Processing task $task_count/$total_tasks: $task"
    
    # Generate and run Cypress test
    log "Starting capture for task: $task"
    generate_cypress_test "$task"
    
    log "Running Cypress test for $task..."
    if timeout 300 npx cypress run --spec "cypress/e2e/${task}_working_capture.cy.js" --browser chrome --headless; then
        success "Cypress test completed for $task"
        
        # Run OCR cleanup
        run_ocr_cleanup "$task"
    else
        error "Cypress test failed or timed out for $task"
    fi
    
    # Small delay between tasks
    sleep 5
done

# Create comprehensive backup
create_backup

# Stop webpack server
log "Stopping webpack server (PID: $WEBPACK_PID)..."
kill $WEBPACK_PID 2>/dev/null || true
sleep 2

success "All tasks completed!"
log "Check the timestamped backup directory for all results" 