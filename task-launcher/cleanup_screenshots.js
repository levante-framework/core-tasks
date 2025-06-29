import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCREENSHOT_DIR = './cypress/screenshots';
const MIN_FILE_SIZE = 1000; // Minimum file size in bytes (likely empty if smaller)
const DUPLICATE_THRESHOLD = 0.95; // Similarity threshold for considering images duplicates

/**
 * Get hash of file content for duplicate detection
 */
function getFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Check if file is likely empty based on size
 */
function isLikelyEmpty(filePath, stats) {
  return stats.size < MIN_FILE_SIZE;
}

/**
 * Get all screenshot files recursively
 */
function getAllScreenshots(dir) {
  const screenshots = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith('.png')) {
          screenshots.push({
            path: fullPath,
            name: item,
            size: stats.size,
            stats: stats
          });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentDir}:`, error.message);
    }
  }
  
  traverse(dir);
  return screenshots;
}

/**
 * Remove empty screenshots
 */
function removeEmptyScreenshots(screenshots) {
  const emptyFiles = screenshots.filter(screenshot => 
    isLikelyEmpty(screenshot.path, screenshot.stats)
  );
  
  console.log(`Found ${emptyFiles.length} likely empty screenshots:`);
  
  emptyFiles.forEach(file => {
    console.log(`  - ${file.name} (${file.size} bytes)`);
    try {
      fs.unlinkSync(file.path);
      console.log(`    ✓ Deleted`);
    } catch (error) {
      console.error(`    ✗ Error deleting: ${error.message}`);
    }
  });
  
  return screenshots.filter(screenshot => 
    !isLikelyEmpty(screenshot.path, screenshot.stats)
  );
}

/**
 * Remove duplicate screenshots based on file hash
 */
function removeDuplicateScreenshots(screenshots) {
  const hashMap = new Map();
  const duplicates = [];
  
  console.log('\nAnalyzing for duplicates...');
  
  screenshots.forEach(screenshot => {
    const hash = getFileHash(screenshot.path);
    if (!hash) return;
    
    if (hashMap.has(hash)) {
      // This is a duplicate
      duplicates.push({
        original: hashMap.get(hash),
        duplicate: screenshot
      });
    } else {
      hashMap.set(hash, screenshot);
    }
  });
  
  console.log(`Found ${duplicates.length} duplicate screenshots:`);
  
  duplicates.forEach(({ original, duplicate }) => {
    console.log(`  - ${duplicate.name} (duplicate of ${original.name})`);
    try {
      fs.unlinkSync(duplicate.path);
      console.log(`    ✓ Deleted duplicate`);
    } catch (error) {
      console.error(`    ✗ Error deleting: ${error.message}`);
    }
  });
  
  return screenshots.filter(screenshot => 
    !duplicates.some(dup => dup.duplicate.path === screenshot.path)
  );
}

/**
 * Remove screenshots that are very similar in size (likely consecutive identical frames)
 */
function removeSimilarSizedScreenshots(screenshots) {
  const SIZE_TOLERANCE = 100; // bytes
  const similarGroups = [];
  
  // Sort by size
  const sortedScreenshots = [...screenshots].sort((a, b) => a.size - b.size);
  
  if (sortedScreenshots.length === 0) return screenshots;
  
  let currentGroup = [sortedScreenshots[0]];
  
  for (let i = 1; i < sortedScreenshots.length; i++) {
    const current = sortedScreenshots[i];
    const previous = sortedScreenshots[i - 1];
    
    if (Math.abs(current.size - previous.size) <= SIZE_TOLERANCE) {
      currentGroup.push(current);
    } else {
      if (currentGroup.length > 3) {
        // Keep first and last, remove middle ones
        similarGroups.push(currentGroup.slice(1, -1));
      }
      currentGroup = [current];
    }
  }
  
  // Handle last group
  if (currentGroup.length > 3) {
    similarGroups.push(currentGroup.slice(1, -1));
  }
  
  const toRemove = similarGroups.flat();
  
  if (toRemove.length > 0) {
    console.log(`\nFound ${toRemove.length} similar-sized screenshots to remove:`);
    
    toRemove.forEach(screenshot => {
      console.log(`  - ${screenshot.name} (${screenshot.size} bytes)`);
      try {
        fs.unlinkSync(screenshot.path);
        console.log(`    ✓ Deleted similar screenshot`);
      } catch (error) {
        console.error(`    ✗ Error deleting: ${error.message}`);
      }
    });
  }
  
  return screenshots.filter(screenshot => 
    !toRemove.some(rem => rem.path === screenshot.path)
  );
}

/**
 * Main cleanup function
 */
function cleanupScreenshots() {
  console.log('🧹 Starting screenshot cleanup...\n');
  
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    console.log(`Screenshot directory ${SCREENSHOT_DIR} does not exist.`);
    return;
  }
  
  let screenshots = getAllScreenshots(SCREENSHOT_DIR);
  console.log(`Found ${screenshots.length} total screenshots\n`);
  
  if (screenshots.length === 0) {
    console.log('No screenshots found to clean up.');
    return;
  }
  
  // Step 1: Remove empty screenshots
  console.log('Step 1: Removing empty screenshots...');
  screenshots = removeEmptyScreenshots(screenshots);
  
  // Step 2: Remove exact duplicates
  console.log('\nStep 2: Removing duplicate screenshots...');
  screenshots = removeDuplicateScreenshots(screenshots);
  
  // Step 3: Remove similar-sized screenshots (likely consecutive identical frames)
  console.log('\nStep 3: Removing similar-sized screenshots...');
  screenshots = removeSimilarSizedScreenshots(screenshots);
  
  console.log(`\n✅ Cleanup complete! ${screenshots.length} screenshots remaining.`);
  
  // Show remaining screenshots by size
  const remainingBySize = screenshots
    .sort((a, b) => a.size - b.size)
    .map(s => `${s.name} (${s.size} bytes)`)
    .slice(0, 10); // Show first 10
  
  if (remainingBySize.length > 0) {
    console.log('\nRemaining screenshots (first 10 by size):');
    remainingBySize.forEach(name => console.log(`  - ${name}`));
    if (screenshots.length > 10) {
      console.log(`  ... and ${screenshots.length - 10} more`);
    }
  }
}

// Run cleanup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupScreenshots();
}

export { cleanupScreenshots }; 