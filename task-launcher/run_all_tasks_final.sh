#!/bin/bash

# Final All Tasks Screenshot Capture with OCR Filtering
set -e

# All 12 tasks
TASKS=("memory-game" "egma-math" "matrix-reasoning" "mental-rotation" "hearts-and-flowers" "same-different-selection" "trog" "vocab" "theory-of-mind" "intro" "roar-inference" "adult-reasoning")
SERVER_PORT=8080
BACKUP_DIR="all_tasks_final_$(date +%Y%m%d_%H%M%S)"

echo "🚀 Final All Tasks Screenshot Capture"
echo "📊 Configuration:"
echo "   - Tasks: ${#TASKS[@]}"
echo "   - Complete runs with OCR filtering"
echo "   - Backup directory: $BACKUP_DIR"
echo ""

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up processes..."
    pkill -f "webpack" 2>/dev/null || true
    pkill -f "cypress" 2>/dev/null || true
    lsof -ti:${SERVER_PORT} | xargs kill -9 2>/dev/null || true
    sleep 3
}

# Start server
start_server() {
    echo "🚀 Starting webpack server..."
    npx webpack serve --mode development --env dbmode=development --port ${SERVER_PORT} > webpack.log 2>&1 &
    
    for i in {1..30}; do
        if curl -s http://localhost:${SERVER_PORT} > /dev/null 2>&1; then
            echo "✅ Server ready"
            return 0
        fi
        sleep 2
    done
    echo "❌ Server failed to start"
    return 1
}

# Run single task
run_task() {
    local task=$1
    echo ""
    echo "🎯 Processing: $task"
    
    # Create task-specific test
    cat > "cypress/e2e/final_${task}.cy.js" << 'EOF'
describe('TASK_NAME Complete Capture', () => {
  it('captures complete TASK_NAME run with screenshots', () => {
    cy.visit('http://localhost:8080/?task=TASK_NAME', { timeout: 60000 });
    
    // Mock fullscreen API
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    let counter = 0;
    
    // Initial screenshot
    cy.screenshot(`${String(counter++).padStart(2, '0')}-start`);
    cy.wait(3000);
    
    // Start task
    cy.get('body').then($body => {
      if ($body.find('button:contains("OK")').length > 0) {
        cy.get('button:contains("OK")').first().click({ force: true });
        cy.screenshot(`${String(counter++).padStart(2, '0')}-after-ok`);
      } else if ($body.find('button:contains("Start")').length > 0) {
        cy.get('button:contains("Start")').first().click({ force: true });
        cy.screenshot(`${String(counter++).padStart(2, '0')}-after-start`);
      }
    });
    
    // Main task loop - 25 iterations with 6-second intervals
    for (let i = 0; i < 25; i++) {
      cy.wait(6000);
      cy.screenshot(`${String(counter++).padStart(2, '0')}-step-${i}`);
      
      // Check for completion
      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        if (text.includes('thank you') || text.includes('complete') || 
            text.includes('exit') || text.includes('finished') || text.includes('done')) {
          cy.screenshot(`${String(counter++).padStart(2, '0')}-completion`);
          return;
        }
        
        // Smart interactions based on task type
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if ($body.find('button:contains("Next")').length > 0) {
          cy.get('button:contains("Next")').first().click({ force: true });
        }
        // Memory game blocks
        else if ($body.find('.jspsych-corsi-block').length > 0) {
          cy.get('.jspsych-corsi-block').then($blocks => {
            const randomIndex = Math.floor(Math.random() * $blocks.length);
            cy.wrap($blocks[randomIndex]).click({ force: true });
          });
        }
        // Adult-reasoning multi-choice
        else if ($body.find('#jspsych-html-multi-response-btngroup button').length > 0) {
          cy.get('#jspsych-html-multi-response-btngroup button').then($buttons => {
            const randomIndex = Math.floor(Math.random() * $buttons.length);
            cy.wrap($buttons[randomIndex]).click({ force: true });
          });
        }
        // Matrix reasoning answer buttons
        else if ($body.find('button').length > 0) {
          cy.get('button').then($buttons => {
            const visibleButtons = $buttons.filter(':visible');
            if (visibleButtons.length > 0) {
              // Prefer answer buttons (A, B, C, D)
              const answerButtons = visibleButtons.filter(':contains("A"), :contains("B"), :contains("C"), :contains("D")');
              if (answerButtons.length > 0) {
                const randomIndex = Math.floor(Math.random() * answerButtons.length);
                cy.wrap(answerButtons[randomIndex]).click({ force: true });
              } else {
                const randomIndex = Math.floor(Math.random() * visibleButtons.length);
                cy.wrap(visibleButtons[randomIndex]).click({ force: true });
              }
            }
          });
        }
      });
    }
    
    cy.screenshot(`${String(counter++).padStart(2, '0')}-final`);
  });
});
EOF
    
    # Replace task name
    sed -i "s/TASK_NAME/$task/g" "cypress/e2e/final_${task}.cy.js"
    
    # Run test
    echo "🚀 Running $task test..."
    local success=false
    if npx cypress run --spec "cypress/e2e/final_${task}.cy.js" --headless --config defaultCommandTimeout=30000,requestTimeout=30000,responseTimeout=30000; then
        success=true
        echo "✅ $task completed successfully"
    else
        echo "⚠️ $task had issues but may have captured screenshots"
    fi
    
    # Check results
    local dir="cypress/screenshots/final_${task}.cy.js"
    if [ -d "$dir" ]; then
        local count=$(ls -1 "$dir"/*.png 2>/dev/null | wc -l)
        echo "📸 Captured $count screenshots for $task"
        
        if [ $count -gt 0 ]; then
            # Show file size variety
            echo "📊 File sizes: $(ls -lah "$dir"/*.png | awk '{print $5}' | sort -u | tr '\n' ' ')"
            
            # Run OCR cleanup
            echo "🔍 Running OCR cleanup for $task..."
            if python3 cleanup_screenshots_ocr.py "$dir/" --execute; then
                local remaining=$(ls -1 "$dir"/*.png 2>/dev/null | wc -l)
                local duplicates=0
                if [ -d "$dir/duplicates_backup" ]; then
                    duplicates=$(ls -1 "$dir/duplicates_backup"/*.png 2>/dev/null | wc -l)
                fi
                echo "✨ $task OCR complete: $remaining unique, $duplicates duplicates backed up"
            else
                echo "⚠️ OCR cleanup failed for $task, keeping all screenshots"
            fi
        fi
    else
        echo "❌ No screenshots found for $task"
    fi
    
    # Copy to backup
    if [ -d "$dir" ]; then
        mkdir -p "$BACKUP_DIR"
        cp -r "$dir" "$BACKUP_DIR/"
        echo "💾 Backed up $task to $BACKUP_DIR/"
    fi
    
    # Cleanup test file
    rm -f "cypress/e2e/final_${task}.cy.js"
    
    echo "✅ $task processing complete"
}

# Main execution
echo "🧹 Initial cleanup..."
cleanup

echo "🚀 Starting server..."
if ! start_server; then
    echo "❌ Failed to start server. Exiting."
    exit 1
fi

echo "📁 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Process all tasks
total_tasks=${#TASKS[@]}
current=1

for task in "${TASKS[@]}"; do
    echo ""
    echo "📍 Task $current of $total_tasks: $task"
    run_task "$task"
    current=$((current + 1))
    
    # Brief pause between tasks
    sleep 3
done

# Final cleanup
echo ""
echo "🧹 Final cleanup..."
cleanup

# Generate summary
echo ""
echo "🎉 ALL TASKS COMPLETED!"
echo "📁 Complete backup: $BACKUP_DIR/"
echo ""
echo "📊 FINAL SUMMARY:"
echo "================================================"

total_unique=0
total_duplicates=0

for task in "${TASKS[@]}"; do
    local dir="cypress/screenshots/final_${task}.cy.js"
    if [ -d "$dir" ]; then
        local unique_count=$(ls -1 "$dir"/*.png 2>/dev/null | wc -l)
        local duplicate_count=0
        if [ -d "$dir/duplicates_backup" ]; then
            duplicate_count=$(ls -1 "$dir/duplicates_backup"/*.png 2>/dev/null | wc -l)
        fi
        
        total_unique=$((total_unique + unique_count))
        total_duplicates=$((total_duplicates + duplicate_count))
        
        printf "%-25s: %2d unique, %2d duplicates\n" "$task" "$unique_count" "$duplicate_count"
    else
        printf "%-25s: %s\n" "$task" "No screenshots"
    fi
done

echo "================================================"
echo "TOTALS: $total_unique unique screenshots, $total_duplicates duplicates backed up"
echo ""
echo "✅ Complete task screenshot capture finished!"
echo "📂 All results preserved in: $BACKUP_DIR/" 