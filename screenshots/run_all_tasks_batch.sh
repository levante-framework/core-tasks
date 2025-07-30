#!/bin/bash

# Batch Task Screenshot Capture - All 12 Tasks
# Uses the proven working simple script for each task

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

# Create backup directory
BACKUP_DIR="all_tasks_batch_$(date +%Y%m%d_%H%M%S)"

log "Starting batch task screenshot capture for all 12 tasks"
log "Tasks: $TASKS"
log "Results will be backed up to: $BACKUP_DIR"

# Initialize counters
task_count=0
total_tasks=$(echo $TASKS | wc -w)
successful_tasks=0
failed_tasks=0
total_screenshots=0

echo "========================================"
echo "BATCH TASK CAPTURE STARTING"
echo "========================================"

# Process each task
for task in $TASKS; do
    task_count=$((task_count + 1))
    
    echo ""
    log "Processing task $task_count/$total_tasks: $task"
    echo "----------------------------------------"
    
    # Run the proven working script for this task
    if ./run_tasks_simple.sh "$task"; then
        success "Task $task completed successfully"
        successful_tasks=$((successful_tasks + 1))
        
        # Count screenshots for this task
        screenshot_dir="cypress/screenshots/${task}_simple.cy.js"
        if [[ -d "$screenshot_dir" ]]; then
            count=$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
            total_screenshots=$((total_screenshots + count))
            log "Task $task: $count unique screenshots captured"
        fi
    else
        error "Task $task failed"
        failed_tasks=$((failed_tasks + 1))
    fi
    
    log "Progress: $task_count/$total_tasks tasks completed"
    echo "========================================"
done

# Create comprehensive backup
log "Creating comprehensive backup..."
mkdir -p "$BACKUP_DIR"
cp -r cypress/screenshots/* "$BACKUP_DIR/" 2>/dev/null || true
cp -r cypress/videos/* "$BACKUP_DIR/" 2>/dev/null || true

# Final summary
echo ""
echo "========================================"
echo "BATCH CAPTURE COMPLETE"
echo "========================================"
success "All tasks processed!"
log "Summary:"
log "  Total tasks: $total_tasks"
log "  Successful: $successful_tasks"
log "  Failed: $failed_tasks"
log "  Total unique screenshots: $total_screenshots"
log "  Backup directory: $BACKUP_DIR"

# Detailed results
echo ""
log "Detailed results by task:"
for task in $TASKS; do
    screenshot_dir="cypress/screenshots/${task}_simple.cy.js"
    if [[ -d "$screenshot_dir" ]]; then
        count=$(ls "$screenshot_dir"/*.png 2>/dev/null | wc -l)
        backup_count=$(ls "$screenshot_dir/duplicates_backup"/*.png 2>/dev/null | wc -l)
        total_before_cleanup=$((count + backup_count))
        log "  $task: $total_before_cleanup → $count screenshots ($(( backup_count > 0 ? backup_count : 0 )) duplicates removed)"
    else
        error "  $task: No screenshots found"
    fi
done

if [[ $failed_tasks -eq 0 ]]; then
    success "🎉 All tasks completed successfully!"
    success "📁 All results backed up to: $BACKUP_DIR"
    success "📊 Total unique screenshots captured: $total_screenshots"
else
    warn "⚠️  $failed_tasks tasks failed, but $successful_tasks completed successfully"
    log "📁 Results for successful tasks backed up to: $BACKUP_DIR"
fi 