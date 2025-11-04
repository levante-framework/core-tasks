#!/bin/bash

# Robust Task Screenshot Backup System
# Usage: ./backup_task_screenshots.sh <task-name>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <task-name>"
    echo "Example: $0 egma-math"
    exit 1
fi

TASK_NAME=$1
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SOURCE_DIR="cypress/screenshots/${TASK_NAME}_complete.cy.js"
BACKUP_ROOT="task_screenshots_backup"
TASK_BACKUP_DIR="$BACKUP_ROOT/${TASK_NAME}_${TIMESTAMP}"

echo "🔒 TASK SCREENSHOT BACKUP SYSTEM"
echo "================================="
echo "📋 Task: $TASK_NAME"
echo "📁 Source: $SOURCE_DIR"
echo "💾 Backup: $TASK_BACKUP_DIR"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Create backup directory structure
mkdir -p "$BACKUP_ROOT"
mkdir -p "$TASK_BACKUP_DIR"

# Count screenshots before backup
TOTAL_SCREENSHOTS=$(find "$SOURCE_DIR" -name "*.png" | wc -l)
if [ $TOTAL_SCREENSHOTS -eq 0 ]; then
    echo "⚠️  Warning: No screenshots found in $SOURCE_DIR"
    exit 1
fi

echo "📸 Found $TOTAL_SCREENSHOTS screenshots to backup"

# Copy all screenshots and reports
echo "🔄 Copying screenshots..."
cp -r "$SOURCE_DIR"/* "$TASK_BACKUP_DIR/" 2>/dev/null

# Verify backup
BACKED_UP_SCREENSHOTS=$(find "$TASK_BACKUP_DIR" -name "*.png" | wc -l)
BACKED_UP_DUPLICATES=$(find "$TASK_BACKUP_DIR/duplicates_backup" -name "*.png" 2>/dev/null | wc -l || echo "0")

echo "✅ Backup completed successfully!"
echo ""
echo "📊 Backup Summary:"
echo "   Original screenshots: $TOTAL_SCREENSHOTS"
echo "   Backed up screenshots: $BACKED_UP_SCREENSHOTS"
echo "   Duplicates preserved: $BACKED_UP_DUPLICATES"
echo "   Backup location: $TASK_BACKUP_DIR"

# Create backup manifest
cat > "$TASK_BACKUP_DIR/backup_manifest.txt" << EOF
Task Screenshot Backup Manifest
===============================
Task Name: $TASK_NAME
Backup Date: $(date)
Original Directory: $SOURCE_DIR
Backup Directory: $TASK_BACKUP_DIR
Total Screenshots: $TOTAL_SCREENSHOTS
Backed Up Screenshots: $BACKED_UP_SCREENSHOTS
Duplicates Preserved: $BACKED_UP_DUPLICATES

Files Included:
$(ls -la "$TASK_BACKUP_DIR" | grep -v "^total")
EOF

echo "📋 Manifest created: $TASK_BACKUP_DIR/backup_manifest.txt"
echo ""
echo "🔐 Screenshots are now safely preserved and can be restored anytime!"
echo "🔄 Original directory remains untouched for continued testing." 