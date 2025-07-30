#!/bin/bash

echo "🎯 Starting TROG Helpers Pattern Capture..."
echo "📸 Uses EXACT timing pattern from working helpers.cy.js"
echo "⏱️ Waits for .lev-stimulus-container to exist/not exist"
echo "🔄 Recursive taskLoop pattern like the working test"
echo "✅ TROG-specific correct answer detection"
echo "🌐 Server should be running on localhost:8080"
echo ""

# Run the TROG helpers pattern capture
npx cypress run --spec "cypress/e2e-screenshot-scripts/trog_helpers_pattern.cy.js" --headless --browser chrome

echo ""
echo "✅ TROG helpers pattern capture completed!"
echo "📁 Screenshots saved in: cypress/screenshots/trog_helpers_pattern.cy.js/"
echo ""
echo "To view results:"
echo "ls -la cypress/screenshots/trog_helpers_pattern.cy.js/" 