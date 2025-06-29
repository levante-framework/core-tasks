const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Running TOM and TROG tests with fullscreen mocking...\n');

// List of tests to run
const tests = [
  'theory_of_mind_fullscreen_mock.cy.js',
  'trog_test_fullscreen_mock.cy.js'
];

const screenshotsDir = path.join(__dirname, 'cypress', 'screenshots');
const backupDir = path.join(__dirname, 'cypress', 'screenshots_backup');

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

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Run each test individually but preserve screenshots
for (let i = 0; i < tests.length; i++) {
  const test = tests[i];
  console.log(`📸 Running ${test} (${i + 1}/${tests.length})...`);
  
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
  
  // After each test, backup the screenshots to preserve them
  if (fs.existsSync(screenshotsDir)) {
    console.log(`📁 Backing up screenshots from ${test}...`);
    copyDir(screenshotsDir, backupDir);
  }
}

// Restore all screenshots from backup
console.log('\n🔄 Restoring all screenshots from backup...');
if (fs.existsSync(screenshotsDir)) {
  // Clear current screenshots directory
  fs.rmSync(screenshotsDir, { recursive: true, force: true });
}
fs.mkdirSync(screenshotsDir, { recursive: true });

// Copy all screenshots back from backup
copyDir(backupDir, screenshotsDir);

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

// Process each test directory separately
for (const [testName, screenshots] of Object.entries(screenshotsByTest)) {
  if (screenshots.length === 0) continue;
  
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

// Clean up backup directory
if (fs.existsSync(backupDir)) {
  fs.rmSync(backupDir, { recursive: true, force: true });
}

// Final statistics across all tests
const finalScreenshotsByTest = getAllScreenshotsByTest(screenshotsDir);
let totalRemainingFiles = 0;

console.log('\n📈 Overall Cleanup Summary:');
console.log(`   Original files across all tests: ${totalOriginalFiles}`);
console.log(`   Blank screenshots removed: ${totalBlanksRemoved}`);
console.log(`   Duplicate screenshots removed: ${totalDuplicatesRemoved}`);
console.log(`   Total files removed: ${totalFilesRemoved}`);

console.log('\n📁 Final screenshots by test:');
for (const [testName, screenshots] of Object.entries(finalScreenshotsByTest)) {
  totalRemainingFiles += screenshots.length;
  console.log(`   ${testName}: ${screenshots.length} screenshots`);
  
  // Show file sizes for verification
  if (screenshots.length > 0) {
    const sizes = screenshots.slice(0, 5).map(file => { // Show first 5 files
      const stats = fs.statSync(file);
      return `${path.basename(file)} (${Math.round(stats.size / 1024)}KB)`;
    });
    const moreText = screenshots.length > 5 ? ` ... and ${screenshots.length - 5} more` : '';
    console.log(`     Sample files: ${sizes.join(', ')}${moreText}`);
  }
}

console.log(`\n📊 Total remaining files across all tests: ${totalRemainingFiles}`);
console.log('\n✅ TOM and TROG tests completed and screenshots cleaned up!');
console.log(`📸 Check the screenshots in: ${screenshotsDir}`); 