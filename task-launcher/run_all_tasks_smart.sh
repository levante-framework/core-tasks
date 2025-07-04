#!/bin/bash

# Comprehensive Task Screenshot Capture with Smart Interactions
# Based on task timeline analysis for optimal interaction strategies

set -e

# Configuration
SCREENSHOT_INTERVAL=8  # seconds between screenshots
TASK_DURATION=180     # 3 minutes per task (enough for most to complete)
MAX_TIMEOUT=300       # 5 minute maximum timeout per task
BACKUP_DIR="all_tasks_smart_$(date +%Y%m%d_%H%M%S)"

# Task list with their specific interaction strategies
declare -A TASKS=(
    ["egma-math"]="afc_with_slider"
    ["matrix-reasoning"]="afc_multi_choice" 
    ["mental-rotation"]="afc_multi_choice"
    ["hearts-and-flowers"]="spatial_response"
    ["memory-game"]="corsi_blocks"
    ["same-different-selection"]="binary_choice"
    ["trog"]="afc_multi_choice"
    ["vocab"]="afc_multi_choice"
    ["theory-of-mind"]="afc_multi_choice"
    ["intro"]="instruction_only"
    ["roar-inference"]="afc_multi_choice"
    ["adult-reasoning"]="afc_multi_choice"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to start webpack dev server
start_webpack_server() {
    log "Starting webpack dev server on port 8080..."
    # We're already in task-launcher directory
    
    # Kill any existing processes on port 8080
    pkill -f "webpack.*8080" || true
    sleep 2
    
    # Start webpack dev server in background
    npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
    WEBPACK_PID=$!
    
    # Wait for server to be ready
    log "Waiting for webpack server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            success "Webpack server is ready!"
            return 0
        fi
        sleep 1
    done
    
    error "Webpack server failed to start"
    return 1
}

# Function to stop webpack server
stop_webpack_server() {
    if [[ -n "$WEBPACK_PID" ]]; then
        log "Stopping webpack server (PID: $WEBPACK_PID)..."
        kill $WEBPACK_PID 2>/dev/null || true
        pkill -f "webpack.*8080" || true
        sleep 2
    fi
}

# Function to generate task-specific Cypress test
generate_task_test() {
    local task_name="$1"
    local interaction_strategy="$2"
    local test_file="cypress/e2e-screenshot-scripts/${task_name}_smart_capture.cy.js"
    
    log "Generating smart test for $task_name with $interaction_strategy strategy..."
    
    # Create the base test structure
    cat > "$test_file" << 'EOF'
describe('Task Screenshot Capture', () => {
  it('should capture screenshots with smart interactions', () => {
    const taskName = 'TASK_NAME';
    const interactionStrategy = 'INTERACTION_STRATEGY';
    const screenshotInterval = SCREENSHOT_INTERVAL * 1000;
    const maxDuration = TASK_DURATION * 1000;
    let screenshotCount = 0;
    
    // Mock fullscreen API
    cy.visit(`http://localhost:8080/?task=${taskName}`, {
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
        
        // Mock audio context for tasks that need it
        win.AudioContext = win.AudioContext || win.webkitAudioContext || function() {
          return {
            createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {} }),
            createGain: () => ({ connect: () => {}, gain: { value: 0 } }),
            destination: {},
            currentTime: 0
          };
        };
      }
    });

    // Initial screenshot
    cy.screenshot(`00-start`, { capture: 'viewport' });
    screenshotCount++;
    
    // Start interaction loop
    const startTime = Date.now();
    
    function performTaskSpecificInteraction() {
      const currentTime = Date.now();
      if (currentTime - startTime > maxDuration) {
        cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        return;
      }
      
      // Take screenshot
      cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-step-${screenshotCount - 1}`, { capture: 'viewport' });
      screenshotCount++;
      
      // Task-specific interaction logic
      cy.then(() => {
        switch (interactionStrategy) {
          case 'afc_multi_choice':
            return performAFCInteraction();
          case 'afc_with_slider':
            return performMathInteraction();
          case 'corsi_blocks':
            return performMemoryGameInteraction();
          case 'spatial_response':
            return performSpatialInteraction();
          case 'binary_choice':
            return performBinaryChoiceInteraction();
          case 'instruction_only':
            return performInstructionInteraction();
          default:
            return performGenericInteraction();
        }
      });
      
      // Continue loop
      cy.wait(screenshotInterval).then(() => {
        if (Date.now() - startTime < maxDuration) {
          performTaskSpecificInteraction();
        } else {
          cy.screenshot(`${String(screenshotCount).padStart(2, '0')}-final`, { capture: 'viewport' });
        }
      });
    }
    
    // AFC (Alternative Forced Choice) interaction for most tasks
    function performAFCInteraction() {
      // Look for multiple choice buttons (2-4 options)
      cy.get('body').then($body => {
        // Try different button selectors in order of preference
        const selectors = [
          '#jspsych-html-multi-response-btngroup button',  // Most common
          '.jspsych-btn',                                   // Standard jsPsych buttons
          'button[data-choice]',                           // Choice buttons
          '.lev-response-row button',                      // Levante framework buttons
          'button:not(.replay):not(#replay-btn-revisited)', // Any button except replay
          'button'                                         // Fallback to any button
        ];
        
        for (let selector of selectors) {
          const buttons = $body.find(selector);
          if (buttons.length >= 2 && buttons.length <= 4) {
            // Found multi-choice buttons, click a random one
            const randomIndex = Math.floor(Math.random() * buttons.length);
            cy.get(selector).eq(randomIndex).click({ force: true });
            return;
          }
        }
        
        // Fallback: look for any clickable element
        performGenericInteraction();
      });
    }
    
    // Math task interaction (includes sliders)
    function performMathInteraction() {
      cy.get('body').then($body => {
        // Check for slider first
        if ($body.find('input[type="range"], .slider').length > 0) {
          cy.get('input[type="range"], .slider').first().then($slider => {
            const min = $slider.attr('min') || 0;
            const max = $slider.attr('max') || 100;
            const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
            cy.wrap($slider).invoke('val', randomValue).trigger('input').trigger('change');
          });
          
          // Look for submit/continue button after slider
          cy.wait(500);
          cy.get('button').contains(/continue|submit|next|ok/i).click({ force: true });
        } else {
          // No slider, use AFC interaction
          performAFCInteraction();
        }
      });
    }
    
    // Memory game interaction (Corsi blocks)
    function performMemoryGameInteraction() {
      cy.get('body').then($body => {
        // Look for Corsi blocks or memory game elements
        const corsiSelectors = [
          '.corsi-block',
          '.memory-block', 
          '[data-block]',
          '.block',
          'div[style*="background-color"]:not(.instructions)'
        ];
        
        let foundBlocks = false;
        for (let selector of corsiSelectors) {
          const blocks = $body.find(selector);
          if (blocks.length > 0) {
            // Click a random block
            const randomIndex = Math.floor(Math.random() * blocks.length);
            cy.get(selector).eq(randomIndex).click({ force: true });
            foundBlocks = true;
            break;
          }
        }
        
        if (!foundBlocks) {
          // Look for OK/Continue buttons (common in memory game instructions)
          const buttonSelectors = [
            'button:contains("OK")',
            'button:contains("Continue")', 
            'button:contains("Next")',
            'button:contains("Start")',
            '.jspsych-btn'
          ];
          
          for (let selector of buttonSelectors) {
            if ($body.find(selector).length > 0) {
              cy.get(selector).first().click({ force: true });
              return;
            }
          }
          
          performGenericInteraction();
        }
      });
    }
    
    // Spatial response (Hearts and Flowers)
    function performSpatialInteraction() {
      cy.get('body').then($body => {
        // Look for directional buttons or spatial elements
        const spatialSelectors = [
          'button[data-direction]',
          '.direction-button',
          'button:contains("←")',
          'button:contains("→")', 
          'button:contains("↑")',
          'button:contains("↓")',
          '.spatial-response button'
        ];
        
        let foundSpatial = false;
        for (let selector of spatialSelectors) {
          if ($body.find(selector).length > 0) {
            const buttons = $body.find(selector);
            const randomIndex = Math.floor(Math.random() * buttons.length);
            cy.get(selector).eq(randomIndex).click({ force: true });
            foundSpatial = true;
            break;
          }
        }
        
        if (!foundSpatial) {
          performAFCInteraction();
        }
      });
    }
    
    // Binary choice interaction
    function performBinaryChoiceInteraction() {
      cy.get('body').then($body => {
        const buttons = $body.find('button:not(.replay):not(#replay-btn-revisited)');
        if (buttons.length === 2) {
          // Exactly 2 buttons, pick randomly
          const randomIndex = Math.floor(Math.random() * 2);
          cy.get('button:not(.replay):not(#replay-btn-revisited)').eq(randomIndex).click({ force: true });
        } else {
          performAFCInteraction();
        }
      });
    }
    
    // Instruction-only interaction
    function performInstructionInteraction() {
      cy.get('body').then($body => {
        // Look for continue/next/OK buttons
        const instructionButtons = [
          'button:contains("Continue")',
          'button:contains("Next")',
          'button:contains("OK")',
          'button:contains("Start")',
          '.jspsych-btn'
        ];
        
        for (let selector of instructionButtons) {
          if ($body.find(selector).length > 0) {
            cy.get(selector).first().click({ force: true });
            return;
          }
        }
        
        performGenericInteraction();
      });
    }
    
    // Generic fallback interaction
    function performGenericInteraction() {
      cy.get('body').then($body => {
        // Try to find any clickable element
        const genericSelectors = [
          'button:not(.replay):not(#replay-btn-revisited):visible',
          'input[type="submit"]:visible',
          '[role="button"]:visible',
          '.clickable:visible',
          'a:visible'
        ];
        
        for (let selector of genericSelectors) {
          if ($body.find(selector).length > 0) {
            cy.get(selector).first().click({ force: true });
            return;
          }
        }
        
        // Last resort: click somewhere in the middle of the screen
        cy.get('body').click(400, 300, { force: true });
      });
    }
    
    // Start the interaction loop
    cy.wait(2000); // Wait for initial load
    performTaskSpecificInteraction();
  });
});
EOF

    # Replace placeholders with actual values
    sed -i "s/TASK_NAME/$task_name/g" "$test_file"
    sed -i "s/INTERACTION_STRATEGY/$interaction_strategy/g" "$test_file"
    sed -i "s/SCREENSHOT_INTERVAL/$SCREENSHOT_INTERVAL/g" "$test_file"
    sed -i "s/TASK_DURATION/$TASK_DURATION/g" "$test_file"
    
    success "Generated test file: $test_file"
}

# Function to run OCR cleanup
run_ocr_cleanup() {
    local task_name="$1"
    local screenshot_dir="cypress/screenshots/${task_name}_smart_capture.cy.js"
    
    if [[ -d "$screenshot_dir" ]]; then
        log "Running OCR cleanup for $task_name..."
        if python3 cleanup_screenshots_ocr.py "$screenshot_dir"; then
            success "OCR cleanup completed for $task_name"
        else
            warn "OCR cleanup failed for $task_name, but continuing..."
        fi
    else
        warn "No screenshots found for $task_name"
    fi
}

# Function to capture task screenshots
capture_task() {
    local task_name="$1"
    local interaction_strategy="$2"
    
    log "Starting capture for task: $task_name (strategy: $interaction_strategy)"
    
    # Generate task-specific test
    generate_task_test "$task_name" "$interaction_strategy"
    
    # Run Cypress test
    log "Running Cypress test for $task_name..."
    if timeout $MAX_TIMEOUT npx cypress run --spec "cypress/e2e-screenshot-scripts/${task_name}_smart_capture.cy.js" --browser chrome --headless; then
        success "Cypress test completed for $task_name"
        
        # Run OCR cleanup
        run_ocr_cleanup "$task_name"
        
        # Count results
        local screenshot_dir="cypress/screenshots/${task_name}_smart_capture.cy.js"
        if [[ -d "$screenshot_dir" ]]; then
            local total_screenshots=$(find "$screenshot_dir" -name "*.png" | wc -l)
            local unique_screenshots=$(find "$screenshot_dir" -maxdepth 1 -name "*.png" | wc -l)
            local duplicates_backup=$(find "$screenshot_dir/duplicates_backup" -name "*.png" 2>/dev/null | wc -l || echo 0)
            
            success "Task $task_name: $total_screenshots total → $unique_screenshots unique (${duplicates_backup} duplicates moved to backup)"
        fi
    else
        error "Cypress test failed or timed out for $task_name"
        return 1
    fi
    
    # Cleanup test file
    rm -f "cypress/e2e-screenshot-scripts/${task_name}_smart_capture.cy.js"
    
    return 0
}

# Main execution
main() {
    log "Starting comprehensive task screenshot capture with smart interactions"
    log "Total tasks defined: ${#TASKS[@]}"
    log "All task keys: ${!TASKS[@]}"
    log "All task values: ${TASKS[@]}"
    log "Screenshot interval: ${SCREENSHOT_INTERVAL}s, Task duration: ${TASK_DURATION}s"
    
    # Start webpack server
    if ! start_webpack_server; then
        error "Failed to start webpack server"
        exit 1
    fi
    
    # Ensure cleanup on exit
    trap 'stop_webpack_server; log "Cleanup completed"' EXIT
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    local successful_tasks=0
    local failed_tasks=0
    local total_screenshots=0
    local total_unique=0
    
    # Process each task
    for task_name in "${!TASKS[@]}"; do
        local interaction_strategy="${TASKS[$task_name]}"
        
        log "Processing task $((successful_tasks + failed_tasks + 1))/${#TASKS[@]}: $task_name"
        
        if capture_task "$task_name" "$interaction_strategy"; then
            ((successful_tasks++))
            
            # Move results to backup directory
            local screenshot_dir="cypress/screenshots/${task_name}_smart_capture.cy.js"
            if [[ -d "$screenshot_dir" ]]; then
                cp -r "$screenshot_dir" "$BACKUP_DIR/"
                
                # Count screenshots
                local task_total=$(find "$screenshot_dir" -name "*.png" | wc -l)
                local task_unique=$(find "$screenshot_dir" -maxdepth 1 -name "*.png" | wc -l)
                total_screenshots=$((total_screenshots + task_total))
                total_unique=$((total_unique + task_unique))
            fi
        else
            ((failed_tasks++))
            warn "Task $task_name failed, continuing with next task..."
        fi
        
        # Brief pause between tasks
        sleep 2
    done
    
    # Final summary
    log "=== FINAL SUMMARY ==="
    success "Successful tasks: $successful_tasks/${#TASKS[@]}"
    if [[ $failed_tasks -gt 0 ]]; then
        warn "Failed tasks: $failed_tasks"
    fi
    success "Total screenshots: $total_screenshots"
    success "Unique screenshots (after OCR): $total_unique"
    success "Reduction: $(( (total_screenshots - total_unique) * 100 / total_screenshots ))%"
    success "Results backed up to: $BACKUP_DIR"
    
    log "Task capture completed!"
}

# Run main function
main "$@"