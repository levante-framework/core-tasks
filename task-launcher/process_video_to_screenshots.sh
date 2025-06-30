#!/bin/bash

# Script to process Cypress video recordings into meaningful screenshots
# Usage: ./process_video_to_screenshots.sh [video_file]

set -e

VIDEO_FILE="$1"
if [ -z "$VIDEO_FILE" ]; then
    echo "Finding most recent video file..."
    VIDEO_FILE=$(find cypress/videos -name "*.mp4" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
fi

if [ -z "$VIDEO_FILE" ] || [ ! -f "$VIDEO_FILE" ]; then
    echo "Error: No video file found or specified"
    echo "Usage: $0 [path/to/video.mp4]"
    exit 1
fi

echo "Processing video: $VIDEO_FILE"

# Create output directory
OUTPUT_DIR="extracted_screenshots"
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/raw_frames"
mkdir -p "$OUTPUT_DIR/filtered_frames"

# Extract frames every 2 seconds
echo "Extracting frames from video..."
ffmpeg -i "$VIDEO_FILE" -vf "fps=0.5" "$OUTPUT_DIR/raw_frames/frame_%04d.png" -y

echo "Extracted $(ls "$OUTPUT_DIR/raw_frames"/*.png | wc -l) frames"

# Function to calculate image hash for duplicate detection
calculate_hash() {
    local file="$1"
    # Use ImageMagick to create a simple hash based on image content
    if command -v convert >/dev/null 2>&1; then
        convert "$file" -resize 50x50! -colorspace Gray -format "%#" info:
    else
        # Fallback: use file size as a simple hash
        stat -c%s "$file"
    fi
}

# Function to check if image is mostly empty/blank
is_blank_image() {
    local file="$1"
    if command -v convert >/dev/null 2>&1; then
        # Check if image is mostly one color (blank/loading screen)
        local colors=$(convert "$file" -format "%k" info:)
        [ "$colors" -lt 10 ]
    else
        # Fallback: check file size (very small files are likely blank)
        local size=$(stat -c%s "$file")
        [ "$size" -lt 5000 ]
    fi
}

# Function to check if image contains common UI elements we want to filter out
contains_filtered_content() {
    local file="$1"
    if command -v convert >/dev/null 2>&1; then
        # Check for predominantly white/black images (loading screens, etc.)
        local mean=$(convert "$file" -colorspace Gray -format "%[mean]" info:)
        local mean_int=$(echo "$mean" | cut -d. -f1)
        # Filter out very bright (>90% white) or very dark (<10% black) images
        [ "$mean_int" -gt 58982 ] || [ "$mean_int" -lt 6553 ]
    else
        false
    fi
}

echo "Filtering frames..."

# Process frames
declare -A seen_hashes
filtered_count=0
total_frames=$(ls "$OUTPUT_DIR/raw_frames"/*.png | wc -l)
current_frame=0

for frame in "$OUTPUT_DIR/raw_frames"/*.png; do
    current_frame=$((current_frame + 1))
    echo -ne "Processing frame $current_frame/$total_frames\r"
    
    if [ ! -f "$frame" ]; then
        continue
    fi
    
    # Skip blank images
    if is_blank_image "$frame"; then
        continue
    fi
    
    # Skip images with filtered content
    if contains_filtered_content "$frame"; then
        continue
    fi
    
    # Calculate hash for duplicate detection
    hash=$(calculate_hash "$frame")
    
    # Skip duplicates
    if [ -n "${seen_hashes[$hash]}" ]; then
        continue
    fi
    
    seen_hashes[$hash]=1
    
    # Copy to filtered directory with timestamp
    filtered_count=$((filtered_count + 1))
    padded_count=$(printf "%04d" $filtered_count)
    cp "$frame" "$OUTPUT_DIR/filtered_frames/screenshot_${padded_count}.png"
done

echo ""
echo "Filtering complete!"
echo "Original frames: $total_frames"
echo "Filtered frames: $filtered_count"

# Create a summary HTML file to view all screenshots
echo "Creating summary HTML..."
cat > "$OUTPUT_DIR/screenshot_summary.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Memory Game Screenshots</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .screenshot { margin: 10px; display: inline-block; text-align: center; }
        .screenshot img { max-width: 300px; max-height: 200px; border: 1px solid #ccc; }
        .screenshot p { margin: 5px 0; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Memory Game Screenshots</h1>
    <p>Extracted from: $VIDEO_FILE</p>
    <p>Total screenshots: $filtered_count</p>
    <hr>
EOF

for screenshot in "$OUTPUT_DIR/filtered_frames"/*.png; do
    if [ -f "$screenshot" ]; then
        filename=$(basename "$screenshot")
        echo "    <div class=\"screenshot\">" >> "$OUTPUT_DIR/screenshot_summary.html"
        echo "        <img src=\"filtered_frames/$filename\" alt=\"$filename\">" >> "$OUTPUT_DIR/screenshot_summary.html"
        echo "        <p>$filename</p>" >> "$OUTPUT_DIR/screenshot_summary.html"
        echo "    </div>" >> "$OUTPUT_DIR/screenshot_summary.html"
    fi
done

cat >> "$OUTPUT_DIR/screenshot_summary.html" << EOF
</body>
</html>
EOF

echo "Summary HTML created: $OUTPUT_DIR/screenshot_summary.html"

# Clean up raw frames to save space
read -p "Delete raw frames to save space? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$OUTPUT_DIR/raw_frames"
    echo "Raw frames deleted"
fi

echo "Done! Screenshots saved to: $OUTPUT_DIR/filtered_frames/"
echo "View summary: open $OUTPUT_DIR/screenshot_summary.html" 