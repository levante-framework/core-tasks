#!/usr/bin/env python3

import os
import sys
import shutil
import json
from datetime import datetime
from collections import defaultdict
import cv2
import numpy as np

try:
    import pytesseract
    from PIL import Image
    from difflib import SequenceMatcher
except ImportError as e:
    print(f"Error: Missing required dependency: {e}")
    print("Please install required packages:")
    print("pip install pytesseract pillow opencv-python")
    sys.exit(1)

def extract_text_from_image(image_path):
    """Extract text from image using OCR, focusing on top half"""
    try:
        # Open image and crop to top half for better text extraction
        with Image.open(image_path) as img:
            width, height = img.size
            top_half = img.crop((0, 0, width, height // 2))
            
            # Extract text using OCR
            text = pytesseract.image_to_string(top_half, config='--psm 6')
            return text.strip().lower()
    except Exception as e:
        print(f"Error extracting text from {image_path}: {e}")
        return ""

def calculate_image_similarity(img1_path, img2_path):
    """Calculate image similarity using correlation coefficient"""
    try:
        # Read images in grayscale
        img1 = cv2.imread(img1_path, cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imread(img2_path, cv2.IMREAD_GRAYSCALE)
        
        if img1 is None or img2 is None:
            return 0.0
            
        # Resize images to same size for comparison
        height, width = min(img1.shape[0], img2.shape[0]), min(img1.shape[1], img2.shape[1])
        img1_resized = cv2.resize(img1, (width, height))
        img2_resized = cv2.resize(img2, (width, height))
        
        # Calculate correlation coefficient
        correlation = cv2.matchTemplate(img1_resized, img2_resized, cv2.TM_CCOEFF_NORMED)[0][0]
        return max(0.0, correlation)  # Ensure non-negative
        
    except Exception as e:
        print(f"Error calculating image similarity between {img1_path} and {img2_path}: {e}")
        return 0.0

def text_similarity(text1, text2):
    """Calculate text similarity using sequence matcher"""
    if not text1 and not text2:
        return 1.0
    if not text1 or not text2:
        return 0.0
    return SequenceMatcher(None, text1, text2).ratio()

def are_duplicates(file1, file2, text1, text2):
    """
    Enhanced duplicate detection using both text and image similarity
    Returns True if items are duplicates (both text AND image highly similar)
    """
    # Calculate text similarity
    text_sim = text_similarity(text1, text2)
    
    # Calculate image similarity
    image_sim = calculate_image_similarity(file1, file2)
    
    # Consider duplicates only if BOTH text and image are highly similar
    text_threshold = 0.80
    image_threshold = 0.95
    
    is_duplicate = (text_sim >= text_threshold) and (image_sim >= image_threshold)
    
    print(f"  Comparing {os.path.basename(file1)} vs {os.path.basename(file2)}")
    print(f"    Text similarity: {text_sim:.3f} (threshold: {text_threshold})")
    print(f"    Image similarity: {image_sim:.3f} (threshold: {image_threshold})")
    print(f"    Duplicate: {is_duplicate}")
    
    return is_duplicate

def group_duplicates(screenshot_files):
    """Group screenshots by similarity using enhanced detection"""
    print("Extracting text from screenshots...")
    
    # Extract text from all images
    image_texts = {}
    for file_path in screenshot_files:
        text = extract_text_from_image(file_path)
        image_texts[file_path] = text
        print(f"  {os.path.basename(file_path)}: '{text[:50]}{'...' if len(text) > 50 else ''}'")
    
    print("\nGrouping duplicates using enhanced detection...")
    
    groups = []
    processed = set()
    
    for i, file1 in enumerate(screenshot_files):
        if file1 in processed:
            continue
            
        # Start a new group with this file
        current_group = [file1]
        processed.add(file1)
        
        # Find all duplicates of this file
        for j, file2 in enumerate(screenshot_files[i+1:], i+1):
            if file2 in processed:
                continue
                
            if are_duplicates(file1, file2, image_texts[file1], image_texts[file2]):
                current_group.append(file2)
                processed.add(file2)
        
        groups.append(current_group)
        print(f"Group {len(groups)}: {len(current_group)} files")
    
    return groups

def cleanup_screenshots(directory):
    """Main cleanup function with enhanced duplicate detection"""
    if not os.path.exists(directory):
        print(f"Error: Directory {directory} does not exist")
        return
    
    # Find all PNG files
    screenshot_files = []
    for file in os.listdir(directory):
        if file.lower().endswith('.png'):
            screenshot_files.append(os.path.join(directory, file))
    
    if not screenshot_files:
        print(f"No PNG files found in {directory}")
        return
    
    screenshot_files.sort()
    total_files = len(screenshot_files)
    
    print(f"Found {total_files} screenshot files in {directory}")
    print("=" * 60)
    
    # Group duplicates using enhanced detection
    groups = group_duplicates(screenshot_files)
    
    # Create duplicates backup directory
    duplicates_dir = os.path.join(directory, "duplicates_backup")
    os.makedirs(duplicates_dir, exist_ok=True)
    
    # Process groups
    kept_files = []
    moved_files = []
    
    for i, group in enumerate(groups, 1):
        if len(group) == 1:
            # Single file, keep it
            kept_files.extend(group)
            print(f"\nGroup {i}: Keeping unique file {os.path.basename(group[0])}")
        else:
            # Multiple files, keep first and move others
            keep_file = group[0]
            duplicate_files = group[1:]
            
            kept_files.append(keep_file)
            moved_files.extend(duplicate_files)
            
            print(f"\nGroup {i}: Keeping {os.path.basename(keep_file)}, moving {len(duplicate_files)} duplicates")
            
            # Move duplicates to backup directory
            for duplicate in duplicate_files:
                backup_path = os.path.join(duplicates_dir, os.path.basename(duplicate))
                # Handle name conflicts
                counter = 1
                while os.path.exists(backup_path):
                    name, ext = os.path.splitext(os.path.basename(duplicate))
                    backup_path = os.path.join(duplicates_dir, f"{name}_{counter}{ext}")
                    counter += 1
                
                shutil.move(duplicate, backup_path)
                print(f"  Moved {os.path.basename(duplicate)} to duplicates_backup/")
    
    # Generate statistics
    unique_files = len(kept_files)
    duplicates_removed = len(moved_files)
    reduction_percentage = (duplicates_removed / total_files) * 100 if total_files > 0 else 0
    
    print("\n" + "=" * 60)
    print("CLEANUP SUMMARY")
    print("=" * 60)
    print(f"Total files processed: {total_files}")
    print(f"Unique files kept: {unique_files}")
    print(f"Duplicates moved to backup: {duplicates_removed}")
    print(f"Reduction: {reduction_percentage:.1f}%")
    print(f"Duplicates backed up to: {duplicates_dir}")
    
    # Save analysis report
    report = {
        "timestamp": datetime.now().isoformat(),
        "directory": directory,
        "total_files": total_files,
        "unique_files": unique_files,
        "duplicates_removed": duplicates_removed,
        "reduction_percentage": reduction_percentage,
        "groups": len(groups),
        "duplicates_backup_dir": duplicates_dir
    }
    
    report_file = os.path.join(directory, "ocr_analysis_report.json")
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"Analysis report saved to: {report_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python cleanup_screenshots_ocr.py <directory>")
        print("Example: python cleanup_screenshots_ocr.py cypress/screenshots/memory_game_capture.cy.js/")
        sys.exit(1)
    
    directory = sys.argv[1]
    cleanup_screenshots(directory) 