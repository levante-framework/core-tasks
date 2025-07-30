import os
import glob

def rename_folder(folder_path, folder_name):
    """Rename all PNG files in a folder."""
    print(f"\n📁 Processing {folder_name}...")
    
    # Get all PNG files
    png_files = glob.glob(os.path.join(folder_path, "*.png"))
    
    if not png_files:
        print(f"   ⚠️  No PNG files found")
        return
    
    print(f"   📸 Found {len(png_files)} PNG files")
    
    # Sort by modification time (oldest first)
    png_files.sort(key=lambda x: os.path.getmtime(x))
    
    # Rename files
    renamed_count = 0
    for i, old_path in enumerate(png_files):
        new_filename = f"{folder_name}-{i+1:03d}.png"
        new_path = os.path.join(folder_path, new_filename)
        
        old_filename = os.path.basename(old_path)
        
        if old_filename == new_filename:
            print(f"   ✅ {new_filename} (already correct)")
        else:
            try:
                os.rename(old_path, new_path)
                print(f"   🔄 {old_filename} → {new_filename}")
                renamed_count += 1
            except Exception as e:
                print(f"   ❌ Error renaming {old_filename}: {e}")
    
    print(f"   ✅ Completed {folder_name} ({renamed_count} files renamed)")

# Main execution
print("🚀 Starting golden-runs image renaming...")

# List of all folders to process
folders = [
    "egma-math",
    "hearts-and-flowers", 
    "matrix-reasoning",
    "memory-game",
    "mental-rotation",
    "same-different",
    "theory-of-mind",
    "trog",
    "vocab"
]

# Process each folder
for folder_name in folders:
    folder_path = os.path.join("golden-runs", folder_name)
    
    if os.path.exists(folder_path) and os.path.isdir(folder_path):
        rename_folder(folder_path, folder_name)
    else:
        print(f"\n❌ Folder {folder_name} not found!")

print("\n🎉 Golden-runs image renaming completed!") 