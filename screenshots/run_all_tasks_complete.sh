#!/bin/bash

# Complete Task Screenshot Capture - All 12 Tasks
# Improved interaction logic to prevent getting stuck

set -e

# Configuration
SCREENSHOT_INTERVAL=8  # seconds between screenshots
TASK_DURATION=300     # 5 minutes per task
MAX_TIMEOUT=360       # 6 minute maximum timeout per task

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

# Function to check if webpack server is running
check_webpack_server() {
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to start webpack server if needed
ensure_webpack_server() {
    if ! check_webpack_server; then
        log "Starting webpack dev server..."
        pkill -f "webpack.*8080" || true
        sleep 2
        npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
        WEBPACK_PID=$!
        
        # Wait for server to be ready
        for i in {1..30}; do
            if check_webpack_server; then
                success "Webpack server is ready!"
                return 0
            fi
            sleep 1
        done
        
        error "Webpack server failed to start"
        return 1
    else
        success "Webpack server already running"
        return 0
    fi
}

# Function to generate improved Cypress test
generate_complete_test() {
    local task_name="$1"
    local test_file="cypress/e2e-screenshot-scripts/${task_name}_complete.cy.js"
    
    log "Generating complete test for $task_name..."
    
    cat > "$test_file" << EOF
describe('$task_name Complete Task Capture', () => {
  it('should capture screenshots while completing entire task', () => {
    const taskName = '$task_name';
    const screenshotInterval = $SCREENSHOT_INTERVAL * 1000;
    const maxDuration = $TASK_DURATION * 1000;
    let screenshotCount = 0;
    let lastInteractionTime = Date.now();
    let stuckCount = 0;
    
    // Visit task with all necessary mocking
    cy.visit(\`http://localhost:8080/?task=\${taskName}\`, {
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
        
        // Mock audio context
        win.AudioContext = win.AudioContext || win.webkitAudioContext || function() {
          return {
            createOscillator: () => ({ 
              connect: () => {}, 
              start: () => {}, 
              stop: () => {},
              frequency: { value: 440 }
            }),
            createGain: () => ({ 
              connect: () => {}, 
              gain: { value: 0.5 }
            }),
            destination: {},
            currentTime: 0,
            state: 'running'
          };
        };
        
        // Mock getUserMedia for tasks that might need it
        win.navigator.mediaDevices = win.navigator.mediaDevices || {};
        win.navigator.mediaDevices.getUserMedia = cy.stub().resolves({
          getTracks: () => []
        });
      }
    });

    // Initial screenshot
    cy.screenshot(\`00-start\`, { capture: 'viewport' });
    screenshotCount++;
    
    // Main interaction loop
    const startTime = Date.now();
    
    function captureAndInteract() {
      const currentTime = Date.now();
      if (currentTime - startTime > maxDuration) {
        cy.screenshot(\`\${String(screenshotCount).padStart(2, '0')}-final\`, { capture: 'viewport' });
        return;
      }
      
      // Take screenshot
      cy.screenshot(\`\${String(screenshotCount).padStart(2, '0')}-step-\${screenshotCount - 1}\`, { capture: 'viewport' });
      screenshotCount++;
      
      // Advanced interaction logic with fallbacks
      cy.get('body').then(\$body => {
        let interactionMade = false;
        
        // Priority 1: Completion or continue buttons
        if (\$body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), .continue-btn, .ok-btn').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start"), .continue-btn, .ok-btn').first().click({ force: true });
          interactionMade = true;
        }
        // Priority 2: Task-specific interactions
        else if (taskName === 'memory-game' && \$body.find('.corsi-block, .memory-block, [class*="corsi"], [id*="corsi"]').length > 0) {
          cy.get('.corsi-block, .memory-block, [class*="corsi"], [id*="corsi"]').first().click({ force: true });
          interactionMade = true;
        }
        else if (taskName === 'hearts-and-flowers' && \$body.find('button[data-response], .response-button, [class*="response"]').length > 0) {
          const buttons = \$body.find('button[data-response], .response-button, [class*="response"]');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('button[data-response], .response-button, [class*="response"]').eq(randomIndex).click({ force: true });
          interactionMade = true;
        }
        // Priority 3: Multiple choice buttons (most common)
        else if (\$body.find('#jspsych-html-multi-response-btngroup button, .jspsych-btn, button[data-choice]').length >= 2) {
          const buttons = \$body.find('#jspsych-html-multi-response-btngroup button, .jspsych-btn, button[data-choice]');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('#jspsych-html-multi-response-btngroup button, .jspsych-btn, button[data-choice]').eq(randomIndex).click({ force: true });
          interactionMade = true;
        }
        // Priority 4: Slider inputs (math tasks)
        else if (\$body.find('input[type="range"], .slider, [class*="slider"], .number-line').length > 0) {
          cy.get('input[type="range"], .slider, [class*="slider"], .number-line').first().then(\$slider => {
            const min = \$slider.attr('min') || 0;
            const max = \$slider.attr('max') || 100;
            const randomValue = Math.floor(Math.random() * (max - min + 1)) + parseInt(min);
            cy.wrap(\$slider).invoke('val', randomValue).trigger('input').trigger('change');
            interactionMade = true;
          });
        }
        // Priority 5: Any enabled buttons
        else if (\$body.find('button:not([disabled]):not(.disabled)').length > 0) {
          const buttons = \$body.find('button:not([disabled]):not(.disabled)');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('button:not([disabled]):not(.disabled)').eq(randomIndex).click({ force: true });
          interactionMade = true;
        }
        // Priority 6: Clickable elements
        else if (\$body.find('[onclick], [data-click], .clickable, .selectable').length > 0) {
          cy.get('[onclick], [data-click], .clickable, .selectable').first().click({ force: true });
          interactionMade = true;
        }
        // Priority 7: Input fields
        else if (\$body.find('input[type="text"], input[type="number"], textarea').length > 0) {
          cy.get('input[type="text"], input[type="number"], textarea').first().type('test', { force: true });
          interactionMade = true;
        }
        
        // If no interaction was made, try some fallback strategies
        if (!interactionMade) {
          stuckCount++;
          if (stuckCount > 3) {
            // Try pressing common keys
            cy.get('body').type('{enter}');
            cy.wait(1000);
            cy.get('body').type(' '); // spacebar
            cy.wait(1000);
            // Try clicking in different areas
            cy.get('body').click(500, 300, { force: true });
            stuckCount = 0;
          }
        } else {
          stuckCount = 0;
          lastInteractionTime = Date.now();
        }
      });
      
      // Continue loop
      cy.wait(screenshotInterval).then(() => {
        if (Date.now() - startTime < maxDuration) {
          captureAndInteract();
        } else {
          cy.screenshot(\`\${String(screenshotCount).padStart(2, '0')}-final\`, { capture: 'viewport' });
        }
      });
    }
    
    // Start the capture loop after initial delay
    cy.wait(3000).then(() => {
      captureAndInteract();
    });
  });
});
EOF

    success "Generated test file: $test_file"
}

# Main execution
log "Starting complete task screenshot capture for all 12 tasks..."
log "Tasks to capture: $TASKS"
log "Screenshot interval: ${SCREENSHOT_INTERVAL}s, Task duration: ${TASK_DURATION}s"

# Ensure webpack server is running
if ! ensure_webpack_server; then
    error "Failed to start webpack server"
    exit 1
fi

# Create backup directory
BACKUP_DIR="all_tasks_complete_$(date +%Y%m%d_%H%M%S)"
log "Results will be backed up to: $BACKUP_DIR"

# Process each task
task_count=0
total_tasks=$(echo $TASKS | wc -w)

for task in $TASKS; do
    task_count=$((task_count + 1))
    log "Processing task $task_count/$total_tasks: $task"
    
    # Generate test
    generate_complete_test "$task"
    
    # Run Cypress test with timeout
    log "Running Cypress test for $task..."
    if timeout $MAX_TIMEOUT npx cypress run --spec "cypress/e2e-screenshot-scripts/${task}_complete.cy.js" --browser electron --config video=false; then
        success "Cypress test completed for $task"
        
        # Check screenshots
        screenshot_dir="cypress/screenshots/${task}_complete.cy.js"
        if [[ -d "$screenshot_dir" ]]; then
            screenshot_count=\$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
            success "Task $task: \$screenshot_count screenshots captured"
            
            # Run OCR cleanup
            log "Running OCR cleanup for $task..."
            if python3 cleanup_screenshots_ocr.py "$screenshot_dir" --execute; then
                success "OCR cleanup completed for $task"
                # Count remaining after cleanup
                remaining_count=\$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
                log "Task $task: \$screenshot_count → \$remaining_count screenshots after cleanup"
            else
                warn "OCR cleanup failed for $task, keeping all screenshots"
            fi
        else
            error "No screenshots found for $task"
        fi
    else
        error "Cypress test failed or timed out for $task"
    fi
    
    # Clean up test file
    rm -f "cypress/e2e-screenshot-scripts/${task}_complete.cy.js"
    
    log "Completed task $task ($task_count/$total_tasks)"
    echo "----------------------------------------"
done

# Create comprehensive backup
log "Creating comprehensive backup..."
mkdir -p "$BACKUP_DIR"
cp -r cypress/screenshots/* "$BACKUP_DIR/" 2>/dev/null || true
cp -r cypress/videos/* "$BACKUP_DIR/" 2>/dev/null || true

# Summary
log "All tasks completed!"
log "Backup created: $BACKUP_DIR"

# Count total results
total_screenshots=0
for task in $TASKS; do
    screenshot_dir="cypress/screenshots/${task}_complete.cy.js"
    if [[ -d "$screenshot_dir" ]]; then
        count=\$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
        total_screenshots=\$((total_screenshots + count))
        log "Task $task: \$count screenshots"
    fi
done

success "Total screenshots captured: \$total_screenshots"
success "All results backed up to: $BACKUP_DIR" 