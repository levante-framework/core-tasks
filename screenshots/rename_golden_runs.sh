#!/bin/bash

# Script to rename images in golden-runs subfolders
# Renames images to <foldername>-###.png where ### is a 3-digit left-padded number
# starting from the oldest file in each subfolder

echo "🚀 Starting golden-runs image renaming..."

# Check if golden-runs directory exists
if [ ! -d "golden-runs" ]; then
    echo "❌ Directory golden-runs not found!"
    exit 1
fi

# Process each subdirectory
for dir in golden-runs/*/; do
    if [ -d "$dir" ]; then
        # Get folder name without path
        folder_name=$(basename "$dir")
        echo ""
        echo "📁 Processing folder: $folder_name"
        
        # Count PNG files
        png_count=$(find "$dir" -name "*.png" -type f | wc -l)
        
        if [ "$png_count" -eq 0 ]; then
            echo "   ⚠️  No PNG files found in $folder_name"
            continue
        fi
        
        echo "   📸 Found $png_count PNG files"
        
        # Create array of files sorted by modification time (oldest first)
        counter=1
        
        # Use find with -printf to get files sorted by modification time
        find "$dir" -name "*.png" -type f -printf "%T@ %p\n" | sort -n | while read timestamp filepath; do
            # Extract filename without path
            old_filename=$(basename "$filepath")
            
            # Generate new filename with 3-digit padding
            new_filename="${folder_name}-$(printf "%03d" $counter).png"
            new_filepath="$dir$new_filename"
            
            # Skip if already correctly named
            if [ "$old_filename" = "$new_filename" ]; then
                echo "   ✅ $new_filename (already correct)"
            else
                # Rename the file
                if mv "$filepath" "$new_filepath" 2>/dev/null; then
                    echo "   🔄 $old_filename → $new_filename"
                else
                    echo "   ❌ Error renaming $old_filename"
                fi
            fi
            
            counter=$((counter + 1))
        done
    fi
done

echo ""
echo "🎉 Golden-runs image renaming completed!" 