#!/bin/bash

# Task Screenshot Capture with Preservation
# This version preserves ALL screenshots from each task

set -e

# Configuration
SCREENSHOT_INTERVAL=6  # seconds between screenshots
TASK_DURATION=240     # 4 minutes per task
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="all_tasks_results_${TIMESTAMP}"

# All 12 tasks
TASKS="hearts-and-flowers egma-math matrix-reasoning mental-rotation memory-game same-different-selection trog vocab theory-of-mind intro roar-inference adult-reasoning"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Create results directory
mkdir -p "$RESULTS_DIR"

log "Starting task screenshot capture with preservation"
log "Results will be saved to: $RESULTS_DIR"
log "Tasks to capture: $TASKS"

# Function to ensure webpack server is running
ensure_webpack_server() {
    log "Checking webpack server status..."
    if ! curl -s http://localhost:8080 > /dev/null; then
        log "Starting webpack dev server on port 8080..."
        npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
        WEBPACK_PID=$!
        
        log "Waiting for server to be ready..."
        for i in {1..30}; do
            if curl -s http://localhost:8080 > /dev/null; then
                success "Webpack server is ready!"
                return 0
            fi
            sleep 2
            echo -n "."
        done
        error "Webpack server failed to start"
        return 1
    else
        success "Webpack server is already running"
    fi
}

# Function to generate a working Cypress test
generate_test() {
    local task_name="$1"
    local test_file="cypress/e2e/${task_name}_preserving.cy.js"
    
    cat > "$test_file" << 'EOF'
describe('Task Screenshot Capture', () => {
  it('should capture screenshots with smart interactions', () => {
    const taskName = Cypress.spec.name.split('_')[0];
    let screenshotCounter = 0;
    
    // Mock fullscreen API
    cy.visit(`http://localhost:8080/?task=${taskName}`, {
      onBeforeLoad(win) {
        // Mock fullscreen API
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
      }
    });

    // Initial screenshot
    cy.screenshot(`00-start`);
    
    // Function to take screenshot and interact
    const captureAndInteract = () => {
      cy.screenshot(`${String(screenshotCounter + 1).padStart(2, '0')}-step-${screenshotCounter}`);
      screenshotCounter++;
      
      // Smart interaction logic with multiple fallbacks
      cy.get('body').then(($body) => {
        // Priority 1: Continue/Next/OK buttons
        if ($body.find('button:contains("Continue"), button:contains("Next"), button:contains("OK"), button:contains("Start")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("Next"), button:contains("OK"), button:contains("Start")').first().click();
        }
        // Priority 2: Task-specific interactions
        else if ($body.find('.corsi-block, [data-choice], .afc-stimulus button, input[type="range"]').length > 0) {
          // Memory game Corsi blocks
          if ($body.find('.corsi-block').length > 0) {
            cy.get('.corsi-block').first().click();
          }
          // Multiple choice buttons
          else if ($body.find('[data-choice]').length > 0) {
            cy.get('[data-choice]').then($choices => {
              const randomIndex = Math.floor(Math.random() * $choices.length);
              cy.wrap($choices[randomIndex]).click();
            });
          }
          // AFC stimulus buttons
          else if ($body.find('.afc-stimulus button').length > 0) {
            cy.get('.afc-stimulus button').then($buttons => {
              const randomIndex = Math.floor(Math.random() * $buttons.length);
              cy.wrap($buttons[randomIndex]).click();
            });
          }
          // Sliders for math tasks
          else if ($body.find('input[type="range"]').length > 0) {
            cy.get('input[type="range"]').first().invoke('val', Math.floor(Math.random() * 100)).trigger('input');
          }
        }
        // Priority 3: Any clickable button
        else if ($body.find('button:not(:disabled)').length > 0) {
          cy.get('button:not(:disabled)').first().click();
        }
        // Priority 4: Keyboard interactions
        else {
          cy.get('body').type(' '); // Space key
        }
      });
    };

    // Capture screenshots at intervals
    const totalScreenshots = Math.floor(TASK_DURATION / SCREENSHOT_INTERVAL);
    for (let i = 0; i < totalScreenshots; i++) {
      cy.wait(SCREENSHOT_INTERVAL * 1000);
      captureAndInteract();
    }
    
    // Final screenshot
    cy.wait(2000);
    cy.screenshot('99-final');
  });
});
EOF

    # Replace TASK_DURATION and SCREENSHOT_INTERVAL with actual values
    sed -i "s/TASK_DURATION/${TASK_DURATION}/g" "$test_file"
    sed -i "s/SCREENSHOT_INTERVAL/${SCREENSHOT_INTERVAL}/g" "$test_file"
    
    success "Generated test file: $test_file"
}

# Function to run a single task
run_task() {
    local task_name="$1"
    local task_number="$2"
    local total_tasks="$3"
    
    log "Processing task $task_number/$total_tasks: $task_name"
    
    # Generate test file
    generate_test "$task_name"
    
    # Run Cypress test
    log "Running Cypress test for $task_name..."
    if timeout ${TASK_DURATION}s npx cypress run --spec "cypress/e2e/${task_name}_preserving.cy.js" --browser chrome; then
        success "Cypress test completed for $task_name"
        
        # Move screenshots to results directory
        local source_dir="cypress/screenshots/${task_name}_preserving.cy.js"
        local dest_dir="$RESULTS_DIR/${task_name}"
        
        if [ -d "$source_dir" ]; then
            mkdir -p "$dest_dir"
            cp -r "$source_dir"/* "$dest_dir/"
            local screenshot_count=$(ls "$dest_dir"/*.png 2>/dev/null | wc -l)
            success "Preserved $screenshot_count screenshots for $task_name in $dest_dir"
            
            # Run OCR cleanup
            log "Running OCR cleanup for $task_name..."
            if python3 cleanup_screenshots_ocr.py "$dest_dir" --execute; then
                success "OCR cleanup completed for $task_name"
            else
                warn "OCR cleanup failed for $task_name, but screenshots are preserved"
            fi
        else
            warn "No screenshots found for $task_name"
        fi
        
        # Clean up cypress screenshots to free space
        rm -rf "$source_dir"
        
    else
        error "Cypress test failed or timed out for $task_name"
    fi
    
    # Clean up test file
    rm -f "cypress/e2e/${task_name}_preserving.cy.js"
}

# Main execution
main() {
    log "Starting comprehensive task capture with preservation"
    
    # Ensure webpack server is running
    ensure_webpack_server
    
    # Process each task
    task_counter=1
    total_tasks=$(echo $TASKS | wc -w)
    
    for task in $TASKS; do
        log "=== TASK $task_counter/$total_tasks: $task ==="
        run_task "$task" "$task_counter" "$total_tasks"
        task_counter=$((task_counter + 1))
        
        # Brief pause between tasks
        sleep 5
    done
    
    # Final summary
    log "=== FINAL SUMMARY ==="
    log "All tasks completed. Results saved to: $RESULTS_DIR"
    
    for task in $TASKS; do
        local task_dir="$RESULTS_DIR/${task}"
        if [ -d "$task_dir" ]; then
            local count=$(ls "$task_dir"/*.png 2>/dev/null | wc -l || echo "0")
            log "  $task: $count screenshots"
        else
            log "  $task: No screenshots"
        fi
    done
    
    success "All tasks completed! Check $RESULTS_DIR for all screenshots"
}

# Cleanup function
cleanup() {
    log "Cleanup initiated..."
    if [ ! -z "$WEBPACK_PID" ]; then
        log "Stopping webpack server (PID: $WEBPACK_PID)..."
        kill $WEBPACK_PID 2>/dev/null || true
    fi
    log "Cleanup completed"
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@" 