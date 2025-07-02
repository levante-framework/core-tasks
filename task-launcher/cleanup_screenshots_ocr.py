#!/usr/bin/env python3
"""
Enhanced screenshot cleanup script using OCR text similarity AND image similarity.
Keeps screenshots that are unique in either text content OR visual content.
"""

import os
import sys
import argparse
from pathlib import Path
from PIL import Image, ImageChops
import pytesseract
from difflib import SequenceMatcher
import hashlib
import json
from typing import List, Dict, Tuple
import re
import numpy as np

def install_requirements():
    """Install required packages if not available."""
    try:
        import pytesseract
        from PIL import Image
        import numpy as np
    except ImportError:
        print("Installing required packages...")
        os.system("pip install pillow pytesseract numpy")
        print("Please also install tesseract-ocr system package:")
        print("  Ubuntu/Debian: sudo apt-get install tesseract-ocr")
        print("  macOS: brew install tesseract")
        sys.exit(1)

def extract_top_text(image_path: str, top_fraction: float = 0.5) -> str:
    """
    Extract text from the top portion of an image using OCR.
    
    Args:
        image_path: Path to the image file
        top_fraction: Fraction of image height to analyze (0.5 = top half)
    
    Returns:
        Extracted text, cleaned and normalized
    """
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            
            # Crop to top portion
            top_height = int(height * top_fraction)
            top_img = img.crop((0, 0, width, top_height))
            
            # Extract text using OCR
            text = pytesseract.image_to_string(top_img, config='--psm 6')
            
            # Clean and normalize text
            text = re.sub(r'\s+', ' ', text.strip())  # Normalize whitespace
            text = re.sub(r'[^\w\s\.\,\!\?\-]', '', text)  # Remove special chars
            text = text.lower()  # Convert to lowercase
            
            return text
            
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return ""

def calculate_image_similarity(image_path1: str, image_path2: str, resize_to: int = 64) -> float:
    """
    Calculate visual similarity between two images using perceptual hashing.
    
    Args:
        image_path1: Path to first image
        image_path2: Path to second image
        resize_to: Size to resize images for comparison (smaller = faster, less precise)
    
    Returns:
        Similarity score between 0.0 and 1.0 (1.0 = identical)
    """
    try:
        with Image.open(image_path1) as img1, Image.open(image_path2) as img2:
            # Convert to grayscale and resize for faster comparison
            img1_small = img1.convert('L').resize((resize_to, resize_to))
            img2_small = img2.convert('L').resize((resize_to, resize_to))
            
            # Convert to numpy arrays
            arr1 = np.array(img1_small)
            arr2 = np.array(img2_small)
            
            # Calculate normalized cross-correlation
            # Flatten arrays
            arr1_flat = arr1.flatten().astype(float)
            arr2_flat = arr2.flatten().astype(float)
            
            # Normalize to mean 0
            arr1_norm = arr1_flat - np.mean(arr1_flat)
            arr2_norm = arr2_flat - np.mean(arr2_flat)
            
            # Calculate correlation coefficient
            correlation = np.corrcoef(arr1_norm, arr2_norm)[0, 1]
            
            # Handle NaN (when std dev is 0)
            if np.isnan(correlation):
                # If both images are uniform (no variation), check if they're the same
                return 1.0 if np.allclose(arr1_flat, arr2_flat) else 0.0
            
            # Convert correlation to similarity (0 to 1)
            similarity = (correlation + 1) / 2
            return max(0.0, min(1.0, similarity))
            
    except Exception as e:
        print(f"Error comparing images {image_path1} and {image_path2}: {e}")
        return 0.0

def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate similarity between two text strings.
    
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not text1 and not text2:
        return 1.0
    if not text1 or not text2:
        return 0.0
    
    return SequenceMatcher(None, text1, text2).ratio()

def get_text_hash(text: str) -> str:
    """Generate a hash for text content."""
    return hashlib.md5(text.encode()).hexdigest()[:8]

def analyze_screenshots(directory: str, text_similarity_threshold: float = 0.8, 
                       image_similarity_threshold: float = 0.95) -> Dict:
    """
    Analyze screenshots and group by BOTH text and image similarity.
    A screenshot is considered a duplicate only if BOTH text AND image are similar.
    
    Args:
        directory: Directory containing screenshots
        text_similarity_threshold: Threshold for text similarity (0.8 = 80% similar)
        image_similarity_threshold: Threshold for image similarity (0.95 = 95% similar)
    
    Returns:
        Dictionary with analysis results
    """
    screenshot_dir = Path(directory)
    if not screenshot_dir.exists():
        print(f"Directory {directory} does not exist!")
        return {}
    
    # Find all PNG files
    png_files = sorted(list(screenshot_dir.glob("*.png")))
    if not png_files:
        print(f"No PNG files found in {directory}")
        return {}
    
    print(f"Found {len(png_files)} screenshots to analyze...")
    
    # Extract text from all screenshots
    screenshot_data = []
    for i, png_file in enumerate(png_files):
        print(f"Processing {i+1}/{len(png_files)}: {png_file.name}")
        
        text = extract_top_text(str(png_file))
        file_size = png_file.stat().st_size
        
        screenshot_data.append({
            'path': str(png_file),
            'name': png_file.name,
            'text': text,
            'text_hash': get_text_hash(text),
            'file_size': file_size,
            'text_length': len(text)
        })
    
    # Group by BOTH text and image similarity
    unique_groups = []
    duplicates = []
    
    print(f"\nComparing images for visual similarity...")
    
    for i, current in enumerate(screenshot_data):
        print(f"Analyzing {i+1}/{len(screenshot_data)}: {current['name']}")
        
        # Check if this screenshot is similar to any existing group
        is_duplicate = False
        
        for group in unique_groups:
            representative = group['representative']
            
            # Calculate both text and image similarity
            text_similarity = calculate_text_similarity(current['text'], representative['text'])
            image_similarity = calculate_image_similarity(current['path'], representative['path'])
            
            print(f"  vs {representative['name']}: text={text_similarity:.3f}, image={image_similarity:.3f}")
            
            # Consider duplicate only if BOTH text AND image are highly similar
            if (text_similarity >= text_similarity_threshold and 
                image_similarity >= image_similarity_threshold):
                
                # This is a duplicate
                current['text_similarity'] = text_similarity
                current['image_similarity'] = image_similarity
                current['duplicate_of'] = representative['name']
                
                group['duplicates'].append(current)
                duplicates.append(current)
                is_duplicate = True
                print(f"    → DUPLICATE (both text and image similar)")
                break
        
        if not is_duplicate:
            # This is unique, create new group
            unique_groups.append({
                'representative': current,
                'duplicates': []
            })
            print(f"    → UNIQUE")
    
    return {
        'total_screenshots': len(screenshot_data),
        'unique_groups': len(unique_groups),
        'total_duplicates': len(duplicates),
        'groups': unique_groups,
        'all_screenshots': screenshot_data,
        'thresholds': {
            'text_similarity': text_similarity_threshold,
            'image_similarity': image_similarity_threshold
        }
    }

def cleanup_screenshots(directory: str, text_similarity_threshold: float = 0.8,
                       image_similarity_threshold: float = 0.95,
                       dry_run: bool = True, backup: bool = True) -> None:
    """
    Clean up screenshots by removing duplicates based on BOTH text and image similarity.
    
    Args:
        directory: Directory containing screenshots
        text_similarity_threshold: Threshold for text similarity
        image_similarity_threshold: Threshold for image similarity
        dry_run: If True, only show what would be deleted
        backup: If True, move duplicates to backup folder instead of deleting
    """
    analysis = analyze_screenshots(directory, text_similarity_threshold, image_similarity_threshold)
    
    if not analysis:
        return
    
    print(f"\n📊 Analysis Results:")
    print(f"   Total screenshots: {analysis['total_screenshots']}")
    print(f"   Unique groups: {analysis['unique_groups']}")
    print(f"   Duplicates to remove: {analysis['total_duplicates']}")
    print(f"   Retention rate: {analysis['unique_groups']}/{analysis['total_screenshots']} ({100*analysis['unique_groups']/analysis['total_screenshots']:.1f}%)")
    print(f"   Thresholds: text≥{analysis['thresholds']['text_similarity']:.2f}, image≥{analysis['thresholds']['image_similarity']:.2f}")
    
    # Show detailed analysis
    print(f"\n📋 Unique Groups:")
    for i, group in enumerate(analysis['groups']):
        rep = group['representative']
        text_preview = rep['text'][:60] + "..." if len(rep['text']) > 60 else rep['text']
        print(f"   Group {i+1}: {rep['name']}")
        print(f"             Text: '{text_preview}'")
        print(f"             Size: {rep['file_size']/1024:.1f}KB")
        
        if group['duplicates']:
            print(f"             Duplicates: {len(group['duplicates'])}")
            for dup in group['duplicates'][:3]:  # Show first 3 duplicates
                text_sim = dup.get('text_similarity', 0)
                image_sim = dup.get('image_similarity', 0)
                print(f"               - {dup['name']} (text: {text_sim:.2f}, image: {image_sim:.2f})")
            if len(group['duplicates']) > 3:
                print(f"               ... and {len(group['duplicates'])-3} more")
        print()
    
    if dry_run:
        print("🔍 DRY RUN - No files will be modified")
        print("   Use --execute to actually perform cleanup")
        return
    
    # Perform cleanup
    backup_dir = None
    if backup:
        backup_dir = Path(directory) / "duplicates_backup"
        backup_dir.mkdir(exist_ok=True)
        print(f"📁 Backup directory: {backup_dir}")
    
    files_processed = 0
    for group in analysis['groups']:
        for duplicate in group['duplicates']:
            files_processed += 1
            src_path = Path(duplicate['path'])
            
            if backup:
                # Move to backup directory
                dst_path = backup_dir / src_path.name
                src_path.rename(dst_path)
                print(f"   Moved: {src_path.name} → duplicates_backup/")
            else:
                # Delete file
                src_path.unlink()
                print(f"   Deleted: {src_path.name}")
    
    print(f"\n✅ Cleanup complete!")
    print(f"   Processed: {files_processed} duplicates")
    print(f"   Remaining: {analysis['unique_groups']} unique screenshots")
    
    # Save analysis report
    report_path = Path(directory) / "cleanup_report.json"
    with open(report_path, 'w') as f:
        json.dump(analysis, f, indent=2)
    print(f"   Report saved: {report_path}")

def main():
    parser = argparse.ArgumentParser(description="Clean up screenshots using OCR text similarity AND image similarity")
    parser.add_argument("directory", help="Directory containing screenshots")
    parser.add_argument("--text-similarity", type=float, default=0.8, 
                       help="Text similarity threshold (0.0-1.0, default: 0.8)")
    parser.add_argument("--image-similarity", type=float, default=0.95, 
                       help="Image similarity threshold (0.0-1.0, default: 0.95)")
    parser.add_argument("--execute", action="store_true", 
                       help="Actually perform cleanup (default is dry run)")
    parser.add_argument("--no-backup", action="store_true", 
                       help="Delete duplicates instead of moving to backup")
    parser.add_argument("--install-deps", action="store_true",
                       help="Install required dependencies")
    
    args = parser.parse_args()
    
    if args.install_deps:
        install_requirements()
        return
    
    # Check if tesseract is available
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        print("❌ Tesseract OCR not found!")
        print("   Install with: sudo apt-get install tesseract-ocr")
        print("   Or use --install-deps flag")
        sys.exit(1)
    
    cleanup_screenshots(
        directory=args.directory,
        text_similarity_threshold=args.text_similarity,
        image_similarity_threshold=args.image_similarity,
        dry_run=not args.execute,
        backup=not args.no_backup
    )

if __name__ == "__main__":
    main() 