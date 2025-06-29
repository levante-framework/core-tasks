const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🧹 Cleaning up vocab test screenshots...\n');

const vocabDir = path.join(__dirname, 'cypress', 'screenshots', 'vocab_test_fullscreen_mock.cy.js');

if (!fs.existsSync(vocabDir)) {
  console.log('❌ Vocab test screenshots directory not found');
  process.exit(1);
}

// Get all PNG files in the vocab directory
const files = fs.readdirSync(vocabDir).filter(file => file.endsWith('.png'));

if (files.length === 0) {
  console.log('ℹ️  No screenshots found in vocab directory');
  process.exit(0);
}

console.log(`📊 Found ${files.length} screenshots in vocab test directory`);

// Analyze each file
const fileAnalysis = [];
const hashGroups = new Map();

for (const file of files) {
  const filePath = path.join(vocabDir, file);
  
  try {
    const stats = fs.statSync(filePath);
    const data = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5').update(data).digest('hex');
    
    const analysis = {
      name: file,
      path: filePath,
      size: stats.size,
      hash: hash,
      isBlank: stats.size < 5 * 1024, // Less than 5KB likely blank
      isSmall: stats.size < 15 * 1024  // Less than 15KB likely just loading screen
    };
    
    fileAnalysis.push(analysis);
    
    // Group by hash for duplicate detection
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, []);
    }
    hashGroups.get(hash).push(analysis);
    
  } catch (error) {
    console.log(`⚠️  Error analyzing ${file}: ${error.message}`);
  }
}

// Identify files to remove
const filesToRemove = new Set();
let blanksCount = 0;
let duplicatesCount = 0;

// Remove blank/very small files
for (const file of fileAnalysis) {
  if (file.isBlank) {
    console.log(`🗑️  Marking blank file for removal: ${file.name} (${file.size} bytes)`);
    filesToRemove.add(file.path);
    blanksCount++;
  } else if (file.isSmall) {
    console.log(`🔍 Small file (likely loading screen): ${file.name} (${Math.round(file.size / 1024)}KB)`);
    // For now, let's also remove very small files as they're likely not useful content
    filesToRemove.add(file.path);
    blanksCount++;
  }
}

// Remove duplicates (keep the largest of each group)
for (const [hash, duplicates] of hashGroups) {
  if (duplicates.length > 1) {
    // Sort by size (descending) and keep the largest
    duplicates.sort((a, b) => b.size - a.size);
    const keepFile = duplicates[0];
    const removeFiles = duplicates.slice(1);
    
    console.log(`🔍 Found ${duplicates.length} duplicates:`);
    console.log(`   Keeping: ${keepFile.name} (${Math.round(keepFile.size / 1024)}KB)`);
    
    for (const duplicate of removeFiles) {
      console.log(`   Removing: ${duplicate.name} (${Math.round(duplicate.size / 1024)}KB)`);
      filesToRemove.add(duplicate.path);
      duplicatesCount++;
    }
  }
}

// Remove the files
let removedCount = 0;
for (const filePath of filesToRemove) {
  try {
    fs.unlinkSync(filePath);
    removedCount++;
  } catch (error) {
    console.log(`⚠️  Could not remove ${path.basename(filePath)}: ${error.message}`);
  }
}

// Show remaining files
const remainingFiles = fs.readdirSync(vocabDir).filter(file => file.endsWith('.png'));

console.log('\n📈 Cleanup Summary:');
console.log(`   Original files: ${files.length}`);
console.log(`   Blank/small files removed: ${blanksCount}`);
console.log(`   Duplicate files removed: ${duplicatesCount}`);
console.log(`   Total files removed: ${removedCount}`);
console.log(`   Remaining files: ${remainingFiles.length}`);

if (remainingFiles.length > 0) {
  console.log('\n📁 Remaining files:');
  for (const file of remainingFiles) {
    const filePath = path.join(vocabDir, file);
    const stats = fs.statSync(filePath);
    console.log(`   ${file} (${Math.round(stats.size / 1024)}KB)`);
  }
} else {
  console.log('\n❌ No screenshots remaining - all were blank, small, or duplicates');
  console.log('💡 This suggests the vocab test is not reaching actual content');
  console.log('   The test may be stuck at the fullscreen prompt or loading screen');
}

console.log('\n✅ Vocab screenshot cleanup complete!'); 