#!/bin/bash

# Script to rename images in all golden-runs subfolders

echo "🚀 Starting golden-runs image renaming for all folders..."

# Make the single folder script executable
chmod +x rename_one_folder.sh

# List of all folders to process
folders=(
    "egma-math"
    "hearts-and-flowers"
    "matrix-reasoning"
    "memory-game"
    "mental-rotation"
    "same-different"
    "theory-of-mind"
    "trog"
    "vocab"
)

# Process each folder
for folder in "${folders[@]}"; do
    echo ""
    ./rename_one_folder.sh "$folder"
done

echo ""
echo "🎉 All golden-runs folders processed!" 