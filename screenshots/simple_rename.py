import os
import glob

# Process memory-game folder first as a test
folder_path = "golden-runs/memory-game"
folder_name = "memory-game"

print(f"Processing {folder_name}...")

# Get all PNG files
png_files = glob.glob(os.path.join(folder_path, "*.png"))
print(f"Found {len(png_files)} PNG files")

# Sort by modification time (oldest first)
png_files.sort(key=lambda x: os.path.getmtime(x))

# Rename files
for i, old_path in enumerate(png_files):
    new_filename = f"{folder_name}-{i+1:03d}.png"
    new_path = os.path.join(folder_path, new_filename)
    
    old_filename = os.path.basename(old_path)
    
    if old_filename == new_filename:
        print(f"✅ {new_filename} (already correct)")
    else:
        try:
            os.rename(old_path, new_path)
            print(f"🔄 {old_filename} → {new_filename}")
        except Exception as e:
            print(f"❌ Error: {e}")

print("Done with memory-game!") 