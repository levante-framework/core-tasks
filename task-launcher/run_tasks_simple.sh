#!/bin/bash

# Simple Task Screenshot Capture - One task at a time with monitoring
# This version is more reliable and easier to debug

# Configuration
SCREENSHOT_INTERVAL=6  # seconds between screenshots
TASK_DURATION=240     # 4 minutes per task
TASK_NAME="${1:-hearts-and-flowers}"  # Default to hearts-and-flowers, or use first argument

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

# Function to ensure webpack server is running
ensure_webpack_server() {
    log "Checking webpack server status..."
    
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        success "Webpack server is already running"
        return 0
    fi
    
    log "Starting webpack dev server..."
    # Kill any existing webpack processes
    pkill -f "webpack.*8080" || true
    sleep 2
    
    # Start webpack server in background
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
        echo -n "."
    done
    
    error "Webpack server failed to start after 30 seconds"
    return 1
}

# Function to generate Cypress test
generate_task_test() {
    local task_name="$1"
    local test_file="cypress/e2e/${task_name}_simple.cy.js"
    
    log "Generating test for $task_name..."
    
    cat > "$test_file" << EOF
describe('$task_name Simple Task Capture', () => {
  it('should capture screenshots while progressing through task', () => {
    const taskName = '$task_name';
    const screenshotInterval = $SCREENSHOT_INTERVAL * 1000;
    const maxDuration = $TASK_DURATION * 1000;
    let screenshotCount = 0;
    
    // Visit task with fullscreen API mocking
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
      
      // Smart interaction logic
      cy.get('body').then(\$body => {
        // Priority 1: Continue/OK/Next buttons
        if (\$body.find('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').length > 0) {
          cy.get('button:contains("Continue"), button:contains("OK"), button:contains("Next"), button:contains("Start")').first().click({ force: true });
        }
        // Priority 2: Multiple choice buttons
        else if (\$body.find('#jspsych-html-multi-response-btngroup button').length >= 2) {
          const buttons = \$body.find('#jspsych-html-multi-response-btngroup button');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('#jspsych-html-multi-response-btngroup button').eq(randomIndex).click({ force: true });
        }
        // Priority 3: Any enabled buttons
        else if (\$body.find('button:not([disabled])').length > 0) {
          const buttons = \$body.find('button:not([disabled])');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('button:not([disabled])').eq(randomIndex).click({ force: true });
        }
        // Priority 4: Sliders (for math tasks)
        else if (\$body.find('input[type="range"]').length > 0) {
          cy.get('input[type="range"]').first().then(\$slider => {
            const min = \$slider.attr('min') || 0;
            const max = \$slider.attr('max') || 100;
            const randomValue = Math.floor(Math.random() * (max - min + 1)) + parseInt(min);
            cy.wrap(\$slider).invoke('val', randomValue).trigger('input').trigger('change');
          });
        }
        // Priority 5: Clickable elements
        else if (\$body.find('.clickable, [onclick]').length > 0) {
          cy.get('.clickable, [onclick]').first().click({ force: true });
        }
        // Fallback: Click center of screen
        else {
          cy.get('body').click(500, 300, { force: true });
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
    
    // Start the capture loop
    cy.wait(3000).then(() => {
      captureAndInteract();
    });
  });
});
EOF

    success "Generated test file: $test_file"
}

# Function to run single task
run_single_task() {
    local task_name="$1"
    
    log "Starting capture for task: $task_name"
    log "Duration: ${TASK_DURATION}s, Interval: ${SCREENSHOT_INTERVAL}s"
    
    # Ensure webpack server is running
    if ! ensure_webpack_server; then
        error "Failed to start webpack server"
        return 1
    fi
    
    # Generate test
    generate_task_test "$task_name"
    
    # Run Cypress test
    log "Running Cypress test for $task_name..."
    if timeout $((TASK_DURATION + 60)) npx cypress run --spec "cypress/e2e/${task_name}_simple.cy.js" --browser electron --config video=false; then
        success "Cypress test completed for $task_name"
        
        # Check results
        screenshot_dir="cypress/screenshots/${task_name}_simple.cy.js"
        if [[ -d "$screenshot_dir" ]]; then
            screenshot_count=$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
            success "Task $task_name: $screenshot_count screenshots captured"
            
            # Show file sizes to verify progression
            log "Screenshot file sizes:"
            ls -lh "$screenshot_dir"/*.png | head -10
            
            # Run OCR cleanup
            log "Running OCR cleanup for $task_name..."
            if python3 cleanup_screenshots_ocr.py "$screenshot_dir" --execute; then
                remaining_count=$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
                success "OCR cleanup completed: $screenshot_count → $remaining_count screenshots"
            else
                warn "OCR cleanup failed, keeping all screenshots"
            fi
        else
            error "No screenshots found for $task_name"
            return 1
        fi
    else
        error "Cypress test failed or timed out for $task_name"
        return 1
    fi
    
    # Clean up test file
    rm -f "cypress/e2e/${task_name}_simple.cy.js"
    
    success "Completed task: $task_name"
    return 0
}

# Main execution
log "Starting simple task screenshot capture"
log "Task: $TASK_NAME"

if run_single_task "$TASK_NAME"; then
    success "Task completed successfully!"
else
    error "Task failed!"
    exit 1
fi 