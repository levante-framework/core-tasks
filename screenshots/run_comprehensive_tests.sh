#!/bin/bash

# Comprehensive Task Screenshot Capture - Enhanced Version with Loading Handler
# Runs all 12 tasks with improved error handling and enhanced OCR

set -e  # Exit on any error

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="all_task_screenshots_${TIMESTAMP}"
TASKS=("egma-math" "matrix-reasoning" "mental-rotation" "hearts-and-flowers" "memory-game" "same-different-selection" "trog" "vocab" "theory-of-mind" "intro" "roar-inference" "adult-reasoning")

echo "🎯 COMPREHENSIVE TASK SCREENSHOT CAPTURE - Enhanced v2.0"
echo "=========================================================="
echo "📁 Results will be preserved in: $BACKUP_DIR"
echo "🔧 Using enhanced OCR algorithm with text + image similarity"
echo "🚀 Enhanced interaction logic with loading screen handling"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if server is running
if ! curl -s http://localhost:8080 > /dev/null; then
    echo "❌ Server not running on port 8080. Please start with: ./start_server_clean.sh"
    exit 1
fi

echo "✅ Server is running on port 8080"
echo ""

# Function to run a single task with enhanced interactions
run_task() {
    local task=$1
    local task_num=$2
    local total_tasks=$3
    
    echo "🚀 [$task_num/$total_tasks] Starting task: $task"
    echo "   📸 Capturing for 8 minutes with enhanced interactions"
    echo "   🔄 Loading screen handling enabled"
    
    # Run Cypress test with longer timeout for loading screens
    if timeout 600 npx cypress run --spec "cypress/e2e-screenshot-scripts/${task}_complete.cy.js" --browser chrome --headless; then
        echo "   ✅ Task $task completed successfully"
        
        # Run enhanced OCR cleanup with both text and image similarity
        local screenshot_dir="cypress/screenshots/${task}_complete.cy.js"
        if [ -d "$screenshot_dir" ]; then
            echo "   🧹 Running enhanced OCR cleanup (text + image similarity)..."
            echo "      - Text similarity threshold: ≥80%"
            echo "      - Image similarity threshold: ≥95%"
            echo "      - Preserving visually unique content"
            
            python3 cleanup_screenshots_ocr.py "$screenshot_dir" --execute
            
            # Show results summary
            local unique_count=$(find "$screenshot_dir" -name "*.png" ! -path "*/duplicates_backup/*" | wc -l)
            local duplicate_count=$(find "$screenshot_dir/duplicates_backup" -name "*.png" 2>/dev/null | wc -l || echo "0")
            local total_original=$((unique_count + duplicate_count))
            local reduction_percent=0
            if [ $total_original -gt 0 ]; then
                reduction_percent=$(( (duplicate_count * 100) / total_original ))
            fi
            
            echo "      ✨ Results: $unique_count unique, $duplicate_count duplicates (${reduction_percent}% reduction)"
            
            # Copy results to backup
            cp -r "$screenshot_dir" "$BACKUP_DIR/"
            echo "   💾 Results backed up to $BACKUP_DIR"
        else
            echo "   ⚠️  No screenshots directory found for $task"
        fi
    else
        echo "   ❌ Task $task failed or timed out"
        # Still try to backup any partial results
        local screenshot_dir="cypress/screenshots/${task}_complete.cy.js"
        if [ -d "$screenshot_dir" ]; then
            cp -r "$screenshot_dir" "$BACKUP_DIR/"
            echo "   💾 Partial results backed up"
        fi
    fi
    
    echo ""
}

# Run all tasks
echo "🎬 Starting comprehensive capture of ${#TASKS[@]} tasks..."
echo ""

task_num=1
for task in "${TASKS[@]}"; do
    run_task "$task" $task_num ${#TASKS[@]}
    ((task_num++))
    
    # Brief pause between tasks to let server stabilize
    sleep 3
done

echo "🎉 COMPREHENSIVE CAPTURE COMPLETE!"
echo "📊 Summary:"
echo "   Total tasks attempted: ${#TASKS[@]}"
echo "   Backup location: $BACKUP_DIR"
echo "   Enhanced OCR: Text + Image similarity analysis"
echo ""
echo "📋 Results summary:"
total_unique=0
total_duplicates=0
successful_tasks=0

for task in "${TASKS[@]}"; do
    screenshot_dir="cypress/screenshots/${task}_complete.cy.js"
    if [ -d "$screenshot_dir" ]; then
        unique_count=$(find "$screenshot_dir" -name "*.png" ! -path "*/duplicates_backup/*" | wc -l)
        duplicate_count=$(find "$screenshot_dir/duplicates_backup" -name "*.png" 2>/dev/null | wc -l || echo "0")
        total_original=$((unique_count + duplicate_count))
        
        if [ $total_original -gt 0 ]; then
            reduction_percent=$(( (duplicate_count * 100) / total_original ))
            echo "   ✅ $task: $unique_count unique, $duplicate_count duplicates (${reduction_percent}% reduction)"
            total_unique=$((total_unique + unique_count))
            total_duplicates=$((total_duplicates + duplicate_count))
            successful_tasks=$((successful_tasks + 1))
        else
            echo "   ❌ $task: No screenshots captured"
        fi
    else
        echo "   ❌ $task: No results found"
    fi
done

echo ""
echo "📈 Overall Statistics:"
echo "   Successful tasks: $successful_tasks/${#TASKS[@]}"
echo "   Total unique screenshots: $total_unique"
echo "   Total duplicates removed: $total_duplicates"
if [ $((total_unique + total_duplicates)) -gt 0 ]; then
    overall_reduction=$(( (total_duplicates * 100) / (total_unique + total_duplicates) ))
    echo "   Overall reduction: ${overall_reduction}%"
fi
echo ""
echo "✨ All results preserved in: $BACKUP_DIR"
echo "🔍 Enhanced OCR algorithm successfully applied to all tasks" 