#!/bin/bash

# Run tasks with immediate backup to prevent Cypress from overwriting
TASKS=("memory-game" "hearts-and-flowers" "matrix-reasoning" "egma-math" "mental-rotation")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="all_tasks_backup_$TIMESTAMP"

echo "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

for task in "${TASKS[@]}"; do
    echo "=== Processing task: $task ==="
    
    # Run Cypress test
    echo "Running Cypress test for $task..."
    npx cypress run --spec "cypress/e2e-screenshot-scripts/${task}_quick.cy.js" --browser chrome --headless
    
    # Backup screenshots immediately
    if [ -d "cypress/screenshots/${task}_quick.cy.js" ]; then
        echo "Backing up screenshots for $task..."
        cp -r "cypress/screenshots/${task}_quick.cy.js" "$BACKUP_DIR/"
        
        # Count screenshots
        screenshot_count=$(find "cypress/screenshots/${task}_quick.cy.js" -name "*.png" | wc -l)
        echo "Captured $screenshot_count screenshots for $task"
    else
        echo "No screenshots found for $task"
    fi
    
    echo "Completed $task"
    echo ""
    sleep 2
done

echo "All tasks completed! Screenshots backed up in: $BACKUP_DIR"
echo "Contents:"
ls -la "$BACKUP_DIR" 