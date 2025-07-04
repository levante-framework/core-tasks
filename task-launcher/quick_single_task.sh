#!/bin/bash
# Quick test for a single task screenshot capture

echo "🎯 QUICK SINGLE TASK TEST"
echo "========================="

TASK="memory-game"
echo "📸 Testing screenshot capture for: $TASK"

# Kill any existing servers
pkill -f "webpack serve" 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 2

# Start webpack dev server
echo "🚀 Starting webpack dev server..."
npx webpack serve --mode development --env dbmode=development --port 8080 > webpack.log 2>&1 &
SERVER_PID=$!

# Wait for server
echo "⏳ Waiting for server to start..."
sleep 15

# Check if server is running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "❌ Server failed to start"
    exit 1
fi
echo "✅ Server is running"

# Create simple Cypress test
TEST_FILE="cypress/e2e-screenshot-scripts/quick_test.cy.js"
mkdir -p cypress/e2e

cat > "$TEST_FILE" << 'EOF'
describe('Quick Memory Game Test', () => {
  it('captures screenshots from memory game', () => {
    // Visit with fullscreen mocking
    cy.visit('http://localhost:8080/?task=memory-game', {
      timeout: 30000,
      onBeforeLoad: (win) => {
        win.document.documentElement.requestFullscreen = cy.stub().resolves();
        win.document.exitFullscreen = cy.stub().resolves();
        Object.defineProperty(win.document, 'fullscreenElement', {
          get: () => win.document.documentElement
        });
        Object.defineProperty(win.document, 'fullscreenEnabled', {
          get: () => true
        });
      }
    });

    // Take initial screenshot
    cy.screenshot('01-initial-load');
    cy.wait(5000);

    // Take screenshots every 10 seconds for 1 minute
    for (let i = 1; i <= 6; i++) {
      cy.wait(10000);
      cy.screenshot(`${(i+1).toString().padStart(2, '0')}-interval-${i}`);
      
      // Try to click any buttons that appear
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("OK")').length > 0) {
          cy.get('button:contains("OK")').first().click({ force: true });
        } else if ($body.find('button:contains("Continue")').length > 0) {
          cy.get('button:contains("Continue")').first().click({ force: true });
        } else if ($body.find('button:contains("Start")').length > 0) {
          cy.get('button:contains("Start")').first().click({ force: true });
        } else if ($body.find('button:visible').length > 0) {
          cy.get('button:visible').first().click({ force: true });
        }
      });
    }

    // Final screenshot
    cy.screenshot('08-final');
  });
});
EOF

# Run Cypress test
echo "🏃 Running Cypress test..."
if npx cypress run --spec "$TEST_FILE" --record false; then
    echo "✅ Test completed successfully!"
    
    # Show results
    echo ""
    echo "📊 RESULTS:"
    SCREENSHOT_DIR="cypress/screenshots/quick_test.cy.js"
    if [ -d "$SCREENSHOT_DIR" ]; then
        echo "Screenshots captured: $(ls "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l)"
        echo "Screenshot files:"
        ls -la "$SCREENSHOT_DIR"/*.png 2>/dev/null | head -10
    else
        echo "❌ No screenshots directory found"
    fi
else
    echo "❌ Test failed"
fi

# Cleanup
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null || true

echo "🎉 Quick test complete!" 