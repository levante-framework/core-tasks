#!/bin/bash
echo "🎯 CAPTURING REMAINING TASKS"
echo "============================"

# Kill any existing processes
pkill -f "webpack serve" 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 2

# Start server
echo "🚀 Starting server..."
npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
SERVER_PID=$!
sleep 15

# Check server
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "❌ Server failed"
    exit 1
fi
echo "✅ Server running"

# Capture memory-game as test
echo "📸 Testing with memory-game..."
cat > ../cypress/e2e/memory_game_test.cy.js << 'CYPRESS_EOF'
describe('Memory Game Test', () => {
  it('captures memory game screenshots', () => {
    cy.visit('http://localhost:8080/?task=memory-game');
    
    cy.window().then((win) => {
      win.document.documentElement.requestFullscreen = cy.stub().resolves();
      Object.defineProperty(win.document, 'fullscreenElement', {
        get: () => win.document.documentElement
      });
    });
    
    cy.screenshot('01-initial');
    
    for (let i = 1; i <= 8; i++) {
      cy.wait(10000);
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        }
      });
      cy.screenshot(`${String(i + 1).padStart(2, '0')}-interval-${i}`);
    }
  });
});
CYPRESS_EOF

# Run test
timeout 180 npx cypress run --spec "../cypress/e2e/memory_game_test.cy.js" --browser electron --headless

echo "✅ Test complete!"
