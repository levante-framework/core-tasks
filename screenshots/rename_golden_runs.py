#!/usr/bin/env python3
"""
Script to rename images in golden-runs subfolders.
Renames images to <foldername>-###.png where ### is a 3-digit left-padded number
starting from the oldest file in each subfolder.
"""

import os
import glob
from pathlib import Path

def rename_images_in_folder(folder_path):
    """Rename all PNG images in a folder with the folder name prefix."""
    folder_name = os.path.basename(folder_path)
    print(f"\n📁 Processing folder: {folder_name}")
    
    # Get all PNG files in the folder
    png_files = glob.glob(os.path.join(folder_path, "*.png"))
    
    if not png_files:
        print(f"   ⚠️  No PNG files found in {folder_name}")
        return
    
    # Sort files by modification time (oldest first)
    png_files.sort(key=lambda x: os.path.getmtime(x))
    
    print(f"   📸 Found {len(png_files)} PNG files")
    
    # Rename each file
    for i, old_path in enumerate(png_files):
        # Generate new filename with 3-digit padding
        new_filename = f"{folder_name}-{i+1:03d}.png"
        new_path = os.path.join(folder_path, new_filename)
        
        # Skip if already correctly named
        if os.path.basename(old_path) == new_filename:
            print(f"   ✅ {new_filename} (already correct)")
            continue
        
        # Rename the file
        try:
            os.rename(old_path, new_path)
            old_filename = os.path.basename(old_path)
            print(f"   🔄 {old_filename} → {new_filename}")
        except Exception as e:
            print(f"   ❌ Error renaming {old_path}: {e}")

def main():
    """Main function to process all subfolders in golden-runs."""
    golden_runs_path = "golden-runs"
    
    if not os.path.exists(golden_runs_path):
        print(f"❌ Directory {golden_runs_path} not found!")
        return
    
    print("🚀 Starting golden-runs image renaming...")
    
    # Get all subdirectories
    subdirs = [d for d in os.listdir(golden_runs_path) 
               if os.path.isdir(os.path.join(golden_runs_path, d))]
    
    print(f"📂 Found {len(subdirs)} subdirectories: {', '.join(subdirs)}")
    
    # Process each subdirectory
    for subdir in subdirs:
        subdir_path = os.path.join(golden_runs_path, subdir)
        rename_images_in_folder(subdir_path)
    
    print("\n🎉 Golden-runs image renaming completed!")

if __name__ == "__main__":
    main() 