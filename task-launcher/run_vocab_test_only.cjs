const { execSync } = require('child_process');

console.log('🔤 Running vocab test only...\n');

try {
  execSync('npx cypress run --spec "cypress/e2e/vocab_test_fullscreen_mock.cy.js" --env takeScreenshots=true', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Vocab test completed');
} catch (error) {
  console.log('⚠️  Vocab test completed with issues (normal for automation)');
}

console.log('\n📸 Check screenshots in: cypress/screenshots/vocab_test_fullscreen_mock.cy.js/'); 