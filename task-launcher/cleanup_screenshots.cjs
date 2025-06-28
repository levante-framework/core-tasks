const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Function to calculate file hash for duplicate detection
function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Function to check if a file is likely a blank/empty screenshot
function isBlankScreenshot(filePath) {
  const stats = fs.statSync(filePath);
  // If file is very small (less than 5KB), it's likely blank
  if (stats.size < 5000) {
    return true;
  }
  return false;
}

// Function to check if screenshot contains meaningful content based on filename patterns
function hasNoContent(filename) {
  const noContentPatterns = [
    'switch_to_fullscreen',
    'fullscreen_prompt',
    'blank_screen',
    'loading_screen',
    'empty_page'
  ];
  
  const lowerFilename = filename.toLowerCase();
  return noContentPatterns.some(pattern => lowerFilename.includes(pattern));
}

function cleanupScreenshots() {
  const screenshotsDir = path.join(__dirname, 'cypress', 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    console.log('Screenshots directory not found');
    return;
  }

  const testDirs = fs.readdirSync(screenshotsDir).filter(item => {
    return fs.statSync(path.join(screenshotsDir, item)).isDirectory();
  });

  let totalRemoved = 0;
  let duplicatesRemoved = 0;
  let blankRemoved = 0;

  testDirs.forEach(testDir => {
    const testPath = path.join(screenshotsDir, testDir);
    const screenshots = fs.readdirSync(testPath).filter(file => file.endsWith('.png'));
    
    console.log(`\nProcessing ${testDir}: ${screenshots.length} screenshots`);
    
    const hashMap = new Map();
    const toRemove = [];

    screenshots.forEach(screenshot => {
      const filePath = path.join(testPath, screenshot);
      
      // Check if it's a blank screenshot
      if (isBlankScreenshot(filePath)) {
        console.log(`  Removing blank: ${screenshot} (${fs.statSync(filePath).size} bytes)`);
        toRemove.push(filePath);
        blankRemoved++;
        return;
      }

      // Check if filename suggests no content
      if (hasNoContent(screenshot)) {
        console.log(`  Removing no-content: ${screenshot}`);
        toRemove.push(filePath);
        blankRemoved++;
        return;
      }

      // Check for duplicates
      const hash = getFileHash(filePath);
      if (hashMap.has(hash)) {
        console.log(`  Removing duplicate: ${screenshot} (duplicate of ${hashMap.get(hash)})`);
        toRemove.push(filePath);
        duplicatesRemoved++;
      } else {
        hashMap.set(hash, screenshot);
      }
    });

    // Remove the files
    toRemove.forEach(filePath => {
      fs.unlinkSync(filePath);
      totalRemoved++;
    });

    const remaining = screenshots.length - toRemove.length;
    console.log(`  Kept ${remaining} screenshots, removed ${toRemove.length}`);
  });

  console.log(`\nCleanup Summary:`);
  console.log(`  Total screenshots removed: ${totalRemoved}`);
  console.log(`  Duplicates removed: ${duplicatesRemoved}`);
  console.log(`  Blank/empty removed: ${blankRemoved}`);
  console.log(`  Unique content screenshots remaining: ${getTotalScreenshots() - totalRemoved}`);
}

function getTotalScreenshots() {
  const screenshotsDir = path.join(__dirname, 'cypress', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) return 0;
  
  let total = 0;
  const testDirs = fs.readdirSync(screenshotsDir).filter(item => {
    return fs.statSync(path.join(screenshotsDir, item)).isDirectory();
  });

  testDirs.forEach(testDir => {
    const testPath = path.join(screenshotsDir, testDir);
    const screenshots = fs.readdirSync(testPath).filter(file => file.endsWith('.png'));
    total += screenshots.length;
  });

  return total;
}

// Function to organize screenshots by content type
function organizeScreenshots() {
  const screenshotsDir = path.join(__dirname, 'cypress', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) return;

  const testDirs = fs.readdirSync(screenshotsDir).filter(item => {
    return fs.statSync(path.join(screenshotsDir, item)).isDirectory();
  });

  testDirs.forEach(testDir => {
    const testPath = path.join(screenshotsDir, testDir);
    const screenshots = fs.readdirSync(testPath).filter(file => file.endsWith('.png'));
    
    console.log(`\nOrganizing ${testDir}:`);
    
    const categories = {
      'content': [],
      'interactions': [],
      'monitoring': [],
      'jspsych': []
    };

    screenshots.forEach(screenshot => {
      const lower = screenshot.toLowerCase();
      if (lower.includes('jspsych') || lower.includes('stimulus')) {
        categories.jspsych.push(screenshot);
      } else if (lower.includes('click') || lower.includes('button')) {
        categories.interactions.push(screenshot);
      } else if (lower.includes('monitoring') || lower.includes('timeline')) {
        categories.monitoring.push(screenshot);
      } else {
        categories.content.push(screenshot);
      }
    });

    Object.entries(categories).forEach(([category, files]) => {
      if (files.length > 0) {
        console.log(`  ${category}: ${files.length} screenshots`);
        files.slice(0, 3).forEach(file => console.log(`    - ${file}`));
        if (files.length > 3) console.log(`    ... and ${files.length - 3} more`);
      }
    });
  });
}

// Run the cleanup
console.log('Starting screenshot cleanup...');
console.log(`Total screenshots before cleanup: ${getTotalScreenshots()}`);

cleanupScreenshots();
organizeScreenshots();

console.log('\nCleanup complete!'); 