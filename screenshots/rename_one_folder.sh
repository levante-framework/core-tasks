#!/bin/bash

# Script to rename images in one golden-runs subfolder
# Usage: ./rename_one_folder.sh <folder_name>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <folder_name>"
    echo "Available folders:"
    ls -1 golden-runs/
    exit 1
fi

folder_name="$1"
folder_path="golden-runs/$folder_name"

if [ ! -d "$folder_path" ]; then
    echo "❌ Directory $folder_path not found!"
    exit 1
fi

echo "📁 Processing folder: $folder_name"

# Change to the folder
cd "$folder_path"

# Get all PNG files sorted by modification time (oldest first)
files=($(ls -1tr *.png 2>/dev/null))

if [ ${#files[@]} -eq 0 ]; then
    echo "   ⚠️  No PNG files found in $folder_name"
    exit 1
fi

echo "   📸 Found ${#files[@]} PNG files"

# Rename each file
for i in "${!files[@]}"; do
    old_filename="${files[$i]}"
    new_filename="${folder_name}-$(printf "%03d" $((i+1))).png"
    
    if [ "$old_filename" = "$new_filename" ]; then
        echo "   ✅ $new_filename (already correct)"
    else
        if mv "$old_filename" "$new_filename" 2>/dev/null; then
            echo "   🔄 $old_filename → $new_filename"
        else
            echo "   ❌ Error renaming $old_filename"
        fi
    fi
done

echo "✅ Completed processing $folder_name" 