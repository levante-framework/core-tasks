const { exec } = require('child_process');
const path = require('path');

console.log('🎯 Running Cypress Screenshot Tests with Fullscreen Mock\n');

const tests = [
  {
    name: 'Intro Test',
    spec: 'cypress/e2e/intro_fullscreen_mock.cy.js'
  },
  {
    name: 'Theory of Mind Test', 
    spec: 'cypress/e2e/theory_of_mind_fullscreen_mock.cy.js'
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`📸 Running ${test.name}...`);
    const command = `npx cypress run --spec "${test.spec}" --env takeScreenshots=true`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`⚠️  ${test.name} completed with errors (this is expected)`);
        console.log(`   Screenshots should still be captured\n`);
        resolve(); // Don't reject on test failures - we still want screenshots
      } else {
        console.log(`✅ ${test.name} completed successfully\n`);
        resolve();
      }
    });
  });
}

async function cleanup() {
  return new Promise((resolve, reject) => {
    console.log('🧹 Cleaning up screenshots...');
    exec('node cleanup_screenshots.cjs', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Cleanup failed:', error);
        reject(error);
      } else {
        console.log('✅ Cleanup completed\n');
        console.log(stdout);
        resolve();
      }
    });
  });
}

async function main() {
  try {
    // Run all tests
    for (const test of tests) {
      await runTest(test);
    }
    
    // Clean up screenshots
    await cleanup();
    
    // Show final results
    console.log('📊 Final Results:');
    exec('find cypress/screenshots -name "*.png" | wc -l', (error, stdout) => {
      if (!error) {
        console.log(`   Total screenshots: ${stdout.trim()}`);
      }
    });
    
    exec('du -sh cypress/screenshots/', (error, stdout) => {
      if (!error) {
        console.log(`   Total size: ${stdout.split('\t')[0]}`);
      }
    });
    
    console.log('\n🎉 Screenshot capture complete!');
    console.log('📁 View screenshots in: cypress/screenshots/');
    console.log('📖 See CYPRESS_SCREENSHOTS.md for more details');
    
  } catch (error) {
    console.error('❌ Process failed:', error);
    process.exit(1);
  }
}

main(); 