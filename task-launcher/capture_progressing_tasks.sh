#!/bin/bash

# Simple Task Screenshot Capture with Proper Progression
# Focuses on actually advancing through tasks instead of getting stuck

# Configuration
SCREENSHOT_INTERVAL=6  # seconds between screenshots
TASK_DURATION=240     # 4 minutes per task
TASKS="hearts-and-flowers memory-game matrix-reasoning egma-math"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to generate a working Cypress test
generate_progressing_test() {
    local task_name="$1"
    local test_file="cypress/e2e-screenshot-scripts/${task_name}_progressing.cy.js"
    
    log "Generating progressing test for $task_name..."
    
    cat > "$test_file" << EOF
describe('$task_name Task Progression Capture', () => {
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
            createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {} }),
            createGain: () => ({ connect: () => {}, gain: { value: 0 } }),
            destination: {},
            currentTime: 0
          };
        };
      }
    });

    // Initial screenshot
    cy.screenshot(\`00-start\`, { capture: 'viewport' });
    screenshotCount++;
    
    // Progressive screenshot and interaction loop
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
      
      // Smart interaction to progress through task
      cy.get('body').then(\$body => {
        // Priority 1: Look for "OK" or "Continue" buttons (instructions)
        if (\$body.find('button:contains("OK"), button:contains("Continue"), button:contains("Next")').length > 0) {
          cy.get('button:contains("OK"), button:contains("Continue"), button:contains("Next")').first().click();
        }
        // Priority 2: Look for Corsi blocks (memory game)
        else if (\$body.find('.corsi-block, .memory-block, [class*="corsi"], [class*="block"]').length > 0) {
          cy.get('.corsi-block, .memory-block, [class*="corsi"], [class*="block"]').first().click();
        }
        // Priority 3: Look for multiple choice buttons
        else if (\$body.find('#jspsych-html-multi-response-btngroup button').length >= 2) {
          const buttons = \$body.find('#jspsych-html-multi-response-btngroup button');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('#jspsych-html-multi-response-btngroup button').eq(randomIndex).click();
        }
        // Priority 4: Look for spatial response buttons (hearts-and-flowers)
        else if (\$body.find('button[data-response], .response-button, [class*="response"]').length > 0) {
          const buttons = \$body.find('button[data-response], .response-button, [class*="response"]');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('button[data-response], .response-button, [class*="response"]').eq(randomIndex).click();
        }
        // Priority 5: Look for slider inputs (math tasks)
        else if (\$body.find('input[type="range"], .slider, [class*="slider"]').length > 0) {
          cy.get('input[type="range"], .slider, [class*="slider"]').first().then(\$slider => {
            const min = \$slider.attr('min') || 0;
            const max = \$slider.attr('max') || 100;
            const randomValue = Math.floor(Math.random() * (max - min + 1)) + parseInt(min);
            cy.wrap(\$slider).invoke('val', randomValue).trigger('input').trigger('change');
          });
        }
        // Priority 6: Look for any clickable buttons
        else if (\$body.find('button:not([disabled]), .jspsych-btn').length > 0) {
          const buttons = \$body.find('button:not([disabled]), .jspsych-btn');
          const randomIndex = Math.floor(Math.random() * buttons.length);
          cy.get('button:not([disabled]), .jspsych-btn').eq(randomIndex).click();
        }
        // Priority 7: Look for clickable elements
        else if (\$body.find('[onclick], [data-click], .clickable').length > 0) {
          cy.get('[onclick], [data-click], .clickable').first().click();
        }
        // Fallback: Click anywhere on screen to potentially advance
        else {
          cy.get('body').click(500, 300);
        }
      });
      
      // Wait and continue
      cy.wait(screenshotInterval).then(() => {
        if (Date.now() - startTime < maxDuration) {
          captureAndInteract();
        } else {
          cy.screenshot(\`\${String(screenshotCount).padStart(2, '0')}-final\`, { capture: 'viewport' });
        }
      });
    }
    
    // Start the capture loop
    cy.wait(2000).then(() => {
      captureAndInteract();
    });
  });
});
EOF

    success "Generated test file: $test_file"
}

# Main execution
log "Starting progressing task screenshot capture..."
log "Tasks to capture: $TASKS"
log "Screenshot interval: ${SCREENSHOT_INTERVAL}s, Task duration: ${TASK_DURATION}s"

# Check if webpack server is running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    error "Webpack server not running on port 8080. Please start it first with: npm run dev"
    exit 1
fi

success "Webpack server is ready!"

# Process each task
task_count=0
for task in $TASKS; do
    task_count=$((task_count + 1))
    log "Processing task $task_count: $task"
    
    # Generate test
    generate_progressing_test "$task"
    
    # Run Cypress test
    log "Running Cypress test for $task..."
    if timeout $((TASK_DURATION + 60)) npx cypress run --spec "cypress/e2e-screenshot-scripts/${task}_progressing.cy.js" --browser electron; then
        success "Cypress test completed for $task"
        
        # Count screenshots
        screenshot_dir="cypress/screenshots/${task}_progressing.cy.js"
        if [[ -d "$screenshot_dir" ]]; then
            screenshot_count=$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
            success "Task $task: $screenshot_count screenshots captured"
            
            # Run OCR cleanup
            log "Running OCR cleanup for $task..."
            if python3 cleanup_screenshots_ocr.py --directory "$screenshot_dir" --execute; then
                success "OCR cleanup completed for $task"
            else
                error "OCR cleanup failed for $task"
            fi
        else
            error "No screenshots found for $task"
        fi
    else
        error "Cypress test failed or timed out for $task"
    fi
    
    log "Completed task $task"
    echo "----------------------------------------"
done

log "All tasks completed!" 