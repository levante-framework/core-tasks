const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Running all screenshot tests with fullscreen mocking (preserving existing screenshots)...\n');

// List of tests to run with fullscreen mocking
const tests = [
  'intro_fullscreen_mock.cy.js',
  'theory_of_mind_fullscreen_mock.cy.js',
  'math_fullscreen_mock.cy.js',
  'memory_fullscreen_mock.cy.js',
  'hearts_and_flowers_fullscreen_mock.cy.js',
  'same_different_fullscreen_mock.cy.js',
  'vocab_test_fullscreen_mock.cy.js',
  'trog_test_fullscreen_mock.cy.js',
  'mental_rotation_test_fullscreen_mock.cy.js',
  'matrix_reasoning_fullscreen_mock.cy.js'
];

const screenshotsDir = path.join(__dirname, 'cypress', 'screenshots');
const preserveDir = path.join(__dirname, 'cypress', 'screenshots_preserve');
const tempDir = path.join(__dirname, 'cypress', 'screenshots_temp');

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Step 1: Preserve existing screenshots
console.log('📦 Preserving existing screenshots...');
if (fs.existsSync(screenshotsDir)) {
  copyDir(screenshotsDir, preserveDir);
  console.log('✅ Existing screenshots preserved');
} else {
  console.log('ℹ️  No existing screenshots to preserve');
}

// Step 2: Run each test and collect new screenshots
console.log('\n📸 Running tests and collecting screenshots...');

for (let i = 0; i < tests.length; i++) {
  const test = tests[i];
  console.log(`\n📸 Running ${test} (${i + 1}/${tests.length})...`);
  
  try {
    // Run the test
    execSync(`npx cypress run --spec "cypress/e2e/${test}" --env takeScreenshots=true`, {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ ${test} completed successfully`);
  } catch (error) {
    console.log(`⚠️  ${test} completed with some issues (this is normal for test automation)`);
  }
  
  // After each test, move the new screenshots to temp directory to preserve them
  if (fs.existsSync(screenshotsDir)) {
    const testDirs = fs.readdirSync(screenshotsDir).filter(item => {
      const fullPath = path.join(screenshotsDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
    
    for (const testDir of testDirs) {
      const srcPath = path.join(screenshotsDir, testDir);
      const destPath = path.join(tempDir, testDir);
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Copy new screenshots to temp, merging with any existing ones for this test
      copyDir(srcPath, destPath);
    }
  }
}

// Step 3: Restore preserved screenshots and merge with new ones
console.log('\n🔄 Merging preserved screenshots with new ones...');

// Clear current screenshots directory
if (fs.existsSync(screenshotsDir)) {
  fs.rmSync(screenshotsDir, { recursive: true, force: true });
}
fs.mkdirSync(screenshotsDir, { recursive: true });

// First, restore all preserved screenshots
if (fs.existsSync(preserveDir)) {
  copyDir(preserveDir, screenshotsDir);
}

// Then, merge in the new screenshots (overwriting any duplicates)
if (fs.existsSync(tempDir)) {
  copyDir(tempDir, screenshotsDir);
}

console.log('\n🧹 Starting screenshot cleanup...\n');

// Get all screenshot files recursively, organized by test directory
function getAllScreenshotsByTest(dir) {
  const testDirs = {};
  
  if (!fs.existsSync(dir)) return testDirs;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // This is a test directory
      testDirs[item] = [];
      const testFiles = fs.readdirSync(fullPath);
      
      for (const file of testFiles) {
        const filePath = path.join(fullPath, file);
        const fileStat = fs.statSync(filePath);
        
        if (fileStat.isFile() && file.endsWith('.png')) {
          testDirs[item].push(filePath);
        }
      }
    }
  }
  
  return testDirs;
}

const screenshotsByTest = getAllScreenshotsByTest(screenshotsDir);
console.log(`📊 Found screenshots in ${Object.keys(screenshotsByTest).length} test directories`);

// Track statistics
let totalDuplicatesRemoved = 0;
let totalBlanksRemoved = 0;
let totalFilesRemoved = 0;
let totalOriginalFiles = 0;

// Only process the tests that were just run
const testNamesToProcess = tests.map(test => test.replace('.cy.js', ''));

// Process each test directory separately, but only the ones we just ran
for (const [testName, screenshots] of Object.entries(screenshotsByTest)) {
  if (screenshots.length === 0) continue;
  
  // Only clean up the tests we just ran, leave others untouched
  if (!testNamesToProcess.includes(testName)) {
    console.log(`⏭️  Skipping ${testName}: ${screenshots.length} screenshots (preserved from previous run)`);
    continue;
  }
  
  console.log(`\n🔍 Processing ${testName}: ${screenshots.length} screenshots`);
  
  let duplicatesRemoved = 0;
  let blanksRemoved = 0;
  
  // Group files by hash to find duplicates within this test
  const hashGroups = new Map();
  const filesToRemove = new Set();
  
  for (const filePath of screenshots) {
    totalOriginalFiles++;
    
    try {
      const stats = fs.statSync(filePath);
      
      // Remove files smaller than 5KB (likely blank or loading screens)
      if (stats.size < 5 * 1024) {
        console.log(`   🗑️  Removing blank: ${path.basename(filePath)} (${stats.size} bytes)`);
        filesToRemove.add(filePath);
        blanksRemoved++;
        continue;
      }
      
      // Calculate hash for duplicate detection within this test
      const data = fs.readFileSync(filePath);
      const hash = crypto.createHash('md5').update(data).digest('hex');
      
      if (!hashGroups.has(hash)) {
        hashGroups.set(hash, []);
      }
      hashGroups.get(hash).push({ path: filePath, size: stats.size });
    } catch (error) {
      console.log(`   ⚠️  Error processing ${path.basename(filePath)}: ${error.message}`);
    }
  }
  
  // Find duplicates within this test (keep the largest one of each duplicate group)
  for (const [hash, files] of hashGroups) {
    if (files.length > 1) {
      // Sort by size (descending) and keep the largest one
      files.sort((a, b) => b.size - a.size);
      const keepFile = files[0];
      const duplicates = files.slice(1);
      
      console.log(`   🔍 Found ${files.length} duplicates in ${testName}`);
      console.log(`      Keeping: ${path.basename(keepFile.path)} (${keepFile.size} bytes)`);
      
      for (const duplicate of duplicates) {
        console.log(`      Removing: ${path.basename(duplicate.path)} (${duplicate.size} bytes)`);
        filesToRemove.add(duplicate.path);
        duplicatesRemoved++;
      }
    }
  }
  
  // Remove the files for this test
  for (const filePath of filesToRemove) {
    try {
      fs.unlinkSync(filePath);
      totalFilesRemoved++;
    } catch (error) {
      console.log(`   ⚠️  Could not remove ${path.basename(filePath)}: ${error.message}`);
    }
  }
  
  totalDuplicatesRemoved += duplicatesRemoved;
  totalBlanksRemoved += blanksRemoved;
  
  const remainingInTest = screenshots.length - filesToRemove.size;
  console.log(`   📊 ${testName}: ${blanksRemoved} blanks + ${duplicatesRemoved} duplicates removed, ${remainingInTest} kept`);
}

// Clean up temporary directories
if (fs.existsSync(preserveDir)) {
  fs.rmSync(preserveDir, { recursive: true, force: true });
}
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// Final statistics across all tests
const finalScreenshotsByTest = getAllScreenshotsByTest(screenshotsDir);
let totalRemainingFiles = 0;

console.log('\n📈 Overall Cleanup Summary:');
console.log(`   Files processed (new tests only): ${totalOriginalFiles}`);
console.log(`   Blank screenshots removed: ${totalBlanksRemoved}`);
console.log(`   Duplicate screenshots removed: ${totalDuplicatesRemoved}`);
console.log(`   Total files removed: ${totalFilesRemoved}`);

console.log('\n📁 Final screenshots by test:');
for (const [testName, screenshots] of Object.entries(finalScreenshotsByTest)) {
  totalRemainingFiles += screenshots.length;
  const wasProcessed = testNamesToProcess.includes(testName) ? '🆕' : '📂';
  console.log(`   ${wasProcessed} ${testName}: ${screenshots.length} screenshots`);
  
  // Show file sizes for verification (first 3 files)
  if (screenshots.length > 0) {
    const sizes = screenshots.slice(0, 3).map(file => {
      const stats = fs.statSync(file);
      return `${path.basename(file)} (${Math.round(stats.size / 1024)}KB)`;
    });
    const moreText = screenshots.length > 3 ? ` ... and ${screenshots.length - 3} more` : '';
    console.log(`     Sample files: ${sizes.join(', ')}${moreText}`);
  }
}

console.log(`\n📊 Total remaining files across all tests: ${totalRemainingFiles}`);
console.log('\n✅ All tests completed and screenshots cleaned up!');
console.log(`📸 Check the screenshots in: ${screenshotsDir}`);
console.log('\n💡 🆕 = newly processed tests, 📂 = preserved from previous runs'); 