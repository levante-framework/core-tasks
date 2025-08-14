#!/bin/bash

# Comprehensive Levante Tasks Screenshot Capture System
# Enhanced with OCR-based duplicate removal and robust interaction logic
# Fixed to work with task-launcher directory structure

set -e

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

# Correct paths for task-launcher structure
TASK_LAUNCHER_DIR="task-launcher"
CYPRESS_DIR="${TASK_LAUNCHER_DIR}/cypress/e2e"
SCREENSHOTS_DIR="${TASK_LAUNCHER_DIR}/cypress/screenshots"

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

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if server is running
check_server() {
    log "Checking if server is running on port 8081..."
    if curl -s http://localhost:8081 > /dev/null; then
        success "Server is running on port 8081"
        return 0
    else
        error "Server is not running on port 8081"
        return 1
    fi
}

# Create enhanced Cypress test file for a task
create_test_file() {
    local task=$1
    local test_file="${CYPRESS_DIR}/${task}_capture.cy.js"
    
    cat > "$test_file" << 'EOF'
describe('TASK_NAME Screenshot Capture', () => {
  beforeEach(() => {
    // Handle any uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      // Return false to prevent any errors from failing the test
      return false;
    });
  });

  it('should capture comprehensive screenshots with enhanced interactions', () => {
    cy.visit('http://localhost:8081/?task=TASK_NAME&skip=true&skipInstructions=true&heavyInstructions=false');
    
    // Wait for initial load
    cy.wait(3000);
    
    // Enhanced interaction strategies
    const interactionStrategies = [
      // Strategy 1: Navigation buttons
      () => {
        cy.get('body').then($body => {
          const buttons = ['Continue', 'OK', 'Next', 'Start', 'Begin', 'Got it'];
          for (const buttonText of buttons) {
            if ($body.find(`button:contains("${buttonText}"), [role="button"]:contains("${buttonText}")`).length > 0) {
              cy.contains(buttonText).first().click({ force: true });
              return;
            }
          }
        });
      },
      
      // Strategy 2: Number line slider interactions
      () => {
        cy.get('body').then($body => {
          if ($body.find('.number-line, [data-testid*="slider"], [role="slider"]').length > 0) {
            cy.get('.number-line, [data-testid*="slider"], [role="slider"]').first().then($slider => {
              const randomValue = Math.floor(Math.random() * 100);
              cy.wrap($slider).click({ force: true });
              cy.wrap($slider).type(`{leftarrow}{leftarrow}{leftarrow}${randomValue}{enter}`, { force: true });
            });
          }
        });
      },
      
      // Strategy 3: Multiple choice responses
      () => {
        cy.get('body').then($body => {
          const choices = $body.find('[data-testid*="choice"], .choice, .option, input[type="radio"]');
          if (choices.length > 0) {
            const randomIndex = Math.floor(Math.random() * choices.length);
            cy.wrap(choices.eq(randomIndex)).click({ force: true });
          }
        });
      },
      
      // Strategy 4: Number inputs
      () => {
        cy.get('body').then($body => {
          if ($body.find('input[type="number"], input[inputmode="numeric"]').length > 0) {
            const randomNumber = Math.floor(Math.random() * 20) + 1;
            cy.get('input[type="number"], input[inputmode="numeric"]').first().clear().type(randomNumber.toString(), { force: true });
          }
        });
      },
      
      // Strategy 5: Audio response buttons with wait
      () => {
        cy.get('body').then($body => {
          if ($body.find('[data-testid*="audio"], .audio-button, [aria-label*="audio"]').length > 0) {
            cy.get('[data-testid*="audio"], .audio-button, [aria-label*="audio"]').first().click({ force: true });
            cy.wait(2000); // Wait for audio
          }
        });
      },
      
      // Strategy 6: Enabled buttons fallback
      () => {
        cy.get('body').then($body => {
          const enabledButtons = $body.find('button:not(:disabled), [role="button"]:not([aria-disabled="true"])');
          if (enabledButtons.length > 0) {
            const randomIndex = Math.floor(Math.random() * enabledButtons.length);
            cy.wrap(enabledButtons.eq(randomIndex)).click({ force: true });
          }
        });
      },
      
      // Strategy 7: Data attribute clickables
      () => {
        cy.get('body').then($body => {
          const clickables = $body.find('[data-testid*="click"], [data-cy*="click"], .clickable');
          if (clickables.length > 0) {
            const randomIndex = Math.floor(Math.random() * clickables.length);
            cy.wrap(clickables.eq(randomIndex)).click({ force: true });
          }
        });
      },
      
      // Strategy 8: Random button selection
      () => {
        cy.get('body').then($body => {
          const allButtons = $body.find('button, [role="button"]');
          if (allButtons.length > 0) {
            const randomIndex = Math.floor(Math.random() * allButtons.length);
            cy.wrap(allButtons.eq(randomIndex)).click({ force: true });
          }
        });
      },
      
      // Strategy 9: Keyboard inputs
      () => {
        cy.get('body').type('{enter}', { force: true });
        cy.wait(500);
        cy.get('body').type(' ', { force: true }); // Space bar
      }
    ];
    
    // Capture screenshots with enhanced interactions
    for (let i = 0; i < 48; i++) { // 8 minutes worth at 10-second intervals
      cy.screenshot(`TASK_NAME-screenshot-${String(i + 1).padStart(3, '0')}`, {
        capture: 'viewport',
        overwrite: true
      });
      
      // Apply multiple interaction strategies
      const strategyIndex = i % interactionStrategies.length;
      try {
        interactionStrategies[strategyIndex]();
      } catch (e) {
        // Continue if interaction fails
      }
      
      // Additional random interaction
      if (Math.random() > 0.5) {
        try {
          const randomStrategy = Math.floor(Math.random() * interactionStrategies.length);
          interactionStrategies[randomStrategy]();
        } catch (e) {
          // Continue if interaction fails
        }
      }
      
      cy.wait(10000); // 10 seconds between screenshots
    }
  });
});
EOF

    # Replace TASK_NAME with actual task name
    sed -i "s/TASK_NAME/${task}/g" "$test_file"
    success "Created test file: $test_file"
}

# Run OCR cleanup for a task
run_ocr_cleanup() {
    local task=$1
    local task_screenshots_dir="${SCREENSHOTS_DIR}/${task}_capture.cy.js"
    
    if [ -d "$task_screenshots_dir" ]; then
        log "Running OCR cleanup for $task..."
        if [ -f "cleanup_screenshots_ocr.py" ]; then
            python3 cleanup_screenshots_ocr.py "$task_screenshots_dir"
            success "OCR cleanup completed for $task"
        else
            warning "OCR cleanup script not found, skipping cleanup for $task"
        fi
    else
        warning "No screenshots directory found for $task"
    fi
}

# Main execution
main() {
    log "Starting comprehensive Levante tasks screenshot capture..."
    
    # Check if server is running
    if ! check_server; then
        error "Please start the development server first:"
        error "cd task-launcher && npm run dev"
        exit 1
    fi
    
    # Create cypress directories if they don't exist
    mkdir -p "$CYPRESS_DIR"
    mkdir -p "$SCREENSHOTS_DIR"
    
    # Create backup directory with timestamp
    BACKUP_DIR="screenshots_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    success "Starting capture for ${#TASKS[@]} tasks..."
    success "Working directory: $(pwd)"
    success "Cypress directory: $CYPRESS_DIR"
    success "Screenshots directory: $SCREENSHOTS_DIR"
    
    for task in "${TASKS[@]}"; do
        log "Processing task: $task"
        
        # Create test file
        create_test_file "$task"
        
        # Run Cypress test with timeout from task-launcher directory
        log "Running Cypress test for $task (10-minute timeout)..."
        if (cd "$TASK_LAUNCHER_DIR" && timeout 600 npx cypress run --spec "cypress/e2e/${task}_capture.cy.js" --headless); then
            success "Cypress test completed for $task"
        else
            warning "Cypress test timed out or failed for $task, continuing..."
        fi
        
        # Run OCR cleanup
        run_ocr_cleanup "$task"
        
        # Copy screenshots to backup
        if [ -d "${SCREENSHOTS_DIR}/${task}_capture.cy.js" ]; then
            cp -r "${SCREENSHOTS_DIR}/${task}_capture.cy.js" "$BACKUP_DIR/"
            success "Backed up screenshots for $task"
        fi
        
        log "Completed processing for $task"
        echo "----------------------------------------"
    done
    
    success "All tasks completed!"
    log "Screenshots saved in: $SCREENSHOTS_DIR"
    log "Backup created in: $BACKUP_DIR"
    
    # Generate summary report
    echo "=== CAPTURE SUMMARY ===" > capture_summary.txt
    echo "Date: $(date)" >> capture_summary.txt
    echo "Tasks processed: ${#TASKS[@]}" >> capture_summary.txt
    echo "" >> capture_summary.txt
    
    for task in "${TASKS[@]}"; do
        task_dir="${SCREENSHOTS_DIR}/${task}_capture.cy.js"
        if [ -d "$task_dir" ]; then
            count=$(find "$task_dir" -name "*.png" | wc -l)
            echo "$task: $count screenshots" >> capture_summary.txt
        else
            echo "$task: No screenshots found" >> capture_summary.txt
        fi
    done
    
    success "Summary report saved to: capture_summary.txt"
}

# Run main function
main "$@" 