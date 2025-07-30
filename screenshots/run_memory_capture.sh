#!/bin/bash

echo "🧠 Starting Memory Game Screenshot Capture..."
echo "📸 Screenshots will be saved to: cypress/screenshots/memory_helpers_pattern.cy.js/"

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Start the dev server in the background if not already running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "🚀 Starting dev server..."
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to be ready
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo "❌ Server failed to start"
            exit 1
        fi
    done
else
    echo "✅ Server already running"
    DEV_PID=""
fi

# Clean up previous screenshots
rm -rf cypress/screenshots/memory_helpers_pattern.cy.js/

# Run the Memory game capture
echo "🎮 Running Memory game capture..."
npx cypress run --spec "cypress/e2e-screenshot-scripts/memory_helpers_pattern.cy.js" --browser chrome --headless

# Check if screenshots were created
if [ -d "cypress/screenshots/memory_helpers_pattern.cy.js" ]; then
    SCREENSHOT_COUNT=$(find cypress/screenshots/memory_helpers_pattern.cy.js -name "*.png" | wc -l)
    echo "📸 Captured $SCREENSHOT_COUNT screenshots!"
    echo "📁 Screenshots saved to: cypress/screenshots/memory_helpers_pattern.cy.js/"
    
    # List first few screenshots
    echo "🖼️  First few screenshots:"
    ls cypress/screenshots/memory_helpers_pattern.cy.js/*.png | head -5
else
    echo "❌ No screenshots were captured"
fi

# Kill the dev server if we started it
if [ ! -z "$DEV_PID" ]; then
    echo "🛑 Stopping dev server..."
    kill $DEV_PID 2>/dev/null
fi

echo "✅ Memory game capture completed!" 