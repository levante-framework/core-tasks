#!/bin/bash

# Complete Task Screenshot Capture & OCR Processing
# Captures all 12 tasks, saves screenshots, and extracts unique ones using OCR

set -e

# Configuration
SCREENSHOT_INTERVAL=5  # seconds between screenshots
TASK_DURATION=240     # 4 minutes per task (48 screenshots each)
SCREENSHOT_COUNT=48   # Total screenshots per task
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="unique_screenshots_${TIMESTAMP}"

# All 12 tasks
TASKS="hearts-and-flowers egma-math matrix-reasoning mental-rotation memory-game same-different-selection trog vocab theory-of-mind intro roar-inference adult-reasoning"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Function to ensure webpack server is running
ensure_webpack_server() {
    log "Checking webpack server status..."
    
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        success "Webpack server is already running"
        return 0
    fi
    
    log "Starting webpack dev server on port 8080..."
    npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
    WEBPACK_PID=$!
    
    # Wait for server to be ready
    log "Waiting for webpack server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            success "Webpack server is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    error "Webpack server failed to start"
    return 1
}

# Function to generate Cypress test for a task
generate_task_test() {
    local task_name="$1"
    local test_file="cypress/e2e-screenshot-scripts/${task_name}_complete.cy.js"
    
    cat > "$test_file" << 'EOF'
describe('TASK_NAME Complete Task Capture', () => {
  it('should capture screenshots throughout entire task', () => {
    let screenshotCounter = 0;
    
    // Visit the task
    cy.visit('http://localhost:8080?task=TASK_NAME');
    
    // Mock fullscreen API to prevent errors
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    // Take initial screenshot
    cy.screenshot('00-start');
    
    // Capture SCREENSHOT_COUNT screenshots over TASK_DURATION seconds (every SCREENSHOT_INTERVAL seconds)
    for (let i = 1; i <= SCREENSHOT_COUNT; i++) {
      // Wait SCREENSHOT_INTERVAL seconds
      cy.wait(SCREENSHOT_INTERVAL * 1000);
      
      // Try interactions before taking screenshot
      cy.get('body').then(($body) => {
        // Strategy 1: Continue/OK/Next buttons
        if ($body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').first().click();
        }
        // Strategy 2: Task-specific elements
        else if ($body.find('[data-choice], .choice-button, .response-button').length > 0) {
          cy.get('[data-choice], .choice-button, .response-button').first().click();
        }
        // Strategy 3: Any enabled buttons
        else if ($body.find('button:not([disabled])').length > 0) {
          cy.get('button:not([disabled])').first().click();
        }
        // Strategy 4: Random button selection for multiple choice tasks
        else if ($body.find('button').length >= 2) {
          // Randomly click one of the available buttons
          const buttonIndex = Math.floor(Math.random() * $body.find('button').length);
          cy.get('button').eq(buttonIndex).click();
        }
      });
      
      // Take screenshot
      cy.screenshot(`${i.toString().padStart(2, '0')}-step-${i}`);
    }
    
    // Final screenshot
    cy.screenshot('99-final');
  });
});
EOF
    
    # Replace placeholders with actual values
    sed -i "s/TASK_NAME/${task_name}/g" "$test_file"
    sed -i "s/TASK_DURATION/${TASK_DURATION}/g" "$test_file"
    sed -i "s/SCREENSHOT_INTERVAL/${SCREENSHOT_INTERVAL}/g" "$test_file"
    sed -i "s/SCREENSHOT_COUNT/${SCREENSHOT_COUNT}/g" "$test_file"
    
    success "Generated test file: $test_file"
}

# Function to run Cypress test for a task
run_task_capture() {
    local task_name="$1"
    local test_file="cypress/e2e-screenshot-scripts/${task_name}_complete.cy.js"
    
    log "Running Cypress test for $task_name..."
    
    # Run with timeout
    if timeout ${TASK_DURATION}s npx cypress run --spec "$test_file" --browser electron --config video=false; then
        success "Cypress test completed for $task_name"
        return 0
    else
        warn "Cypress test for $task_name completed with timeout (expected)"
        return 0
    fi
}

# Function to process screenshots with OCR
process_screenshots_ocr() {
    local task_name="$1"
    local screenshot_dir="cypress/screenshots/${task_name}_complete.cy.js"
    
    if [ ! -d "$screenshot_dir" ]; then
        warn "No screenshots directory found for $task_name"
        return 1
    fi
    
    local screenshot_count=$(find "$screenshot_dir" -name "*.png" | wc -l)
    if [ "$screenshot_count" -eq 0 ]; then
        warn "No screenshots found for $task_name"
        return 1
    fi
    
    log "Processing $screenshot_count screenshots for $task_name with OCR..."
    
    # Run OCR cleanup
    if python3 cleanup_screenshots_ocr.py "$screenshot_dir" --execute; then
        local unique_count=$(find "$screenshot_dir" -name "*.png" -not -path "*/duplicates_backup/*" | wc -l)
        success "OCR processing completed for $task_name: $screenshot_count → $unique_count unique screenshots"
        
        # Copy unique screenshots to results directory
        local task_results_dir="$RESULTS_DIR/$task_name"
        mkdir -p "$task_results_dir"
        find "$screenshot_dir" -name "*.png" -not -path "*/duplicates_backup/*" -exec cp {} "$task_results_dir/" \;
        
        info "Unique screenshots saved to: $task_results_dir"
        return 0
    else
        error "OCR processing failed for $task_name"
        return 1
    fi
}

# Function to cleanup
cleanup() {
    log "Cleaning up..."
    if [ ! -z "$WEBPACK_PID" ]; then
        log "Stopping webpack server (PID: $WEBPACK_PID)..."
        kill $WEBPACK_PID 2>/dev/null || true
        wait $WEBPACK_PID 2>/dev/null || true
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    log "🚀 Starting Complete Task Screenshot Capture & OCR Processing"
    log "Tasks to process: $(echo $TASKS | wc -w) tasks"
    log "Screenshot interval: ${SCREENSHOT_INTERVAL}s, Task duration: ${TASK_DURATION}s"
    log "Results will be saved to: $RESULTS_DIR"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Ensure webpack server is running
    if ! ensure_webpack_server; then
        error "Failed to start webpack server"
        exit 1
    fi
    
    # Process each task
    local task_num=1
    local total_tasks=$(echo $TASKS | wc -w)
    local successful_tasks=0
    local total_unique_screenshots=0
    
    for task in $TASKS; do
        log ""
        log "📋 Processing task $task_num/$total_tasks: $task"
        log "============================================"
        
        # Generate test
        if generate_task_test "$task"; then
            # Run capture
            if run_task_capture "$task"; then
                # Process with OCR
                if process_screenshots_ocr "$task"; then
                    successful_tasks=$((successful_tasks + 1))
                    local task_unique_count=$(find "$RESULTS_DIR/$task" -name "*.png" | wc -l)
                    total_unique_screenshots=$((total_unique_screenshots + task_unique_count))
                    success "✅ Task $task completed successfully ($task_unique_count unique screenshots)"
                else
                    error "❌ Task $task failed during OCR processing"
                fi
            else
                error "❌ Task $task failed during capture"
            fi
        else
            error "❌ Task $task failed during test generation"
        fi
        
        task_num=$((task_num + 1))
        
        # Small delay between tasks
        sleep 2
    done
    
    # Final summary
    log ""
    log "🎉 FINAL SUMMARY"
    log "================"
    success "Successful tasks: $successful_tasks/$total_tasks"
    success "Total unique screenshots: $total_unique_screenshots"
    success "Results saved in: $RESULTS_DIR"
    
    # Create summary file
    cat > "$RESULTS_DIR/SUMMARY.txt" << EOF
Task Screenshot Capture Summary
Generated: $(date)

Configuration:
- Screenshot interval: ${SCREENSHOT_INTERVAL} seconds
- Task duration: ${TASK_DURATION} seconds
- Total tasks attempted: $total_tasks
- Successful tasks: $successful_tasks
- Total unique screenshots: $total_unique_screenshots

Results Directory Structure:
$RESULTS_DIR/
$(find "$RESULTS_DIR" -type d -name "*" | sed 's|^|  |')

Unique Screenshots by Task:
$(for task in $TASKS; do
    if [ -d "$RESULTS_DIR/$task" ]; then
        count=$(find "$RESULTS_DIR/$task" -name "*.png" | wc -l)
        echo "  $task: $count screenshots"
    fi
done)
EOF
    
    success "Summary saved to: $RESULTS_DIR/SUMMARY.txt"
    
    if [ "$successful_tasks" -gt 0 ]; then
        log ""
        info "🔍 To view your unique screenshots:"
        info "   cd $RESULTS_DIR"
        info "   ls -la"
        log ""
    fi
}

# Run main function
main "$@" 