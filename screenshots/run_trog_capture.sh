#!/bin/bash

echo "🎯 Starting TROG Screenshot Capture..."
echo "📸 Using smart content-aware capture approach"
echo "🌐 Server should be running on localhost:8080"
echo ""

# Run the TROG capture test
npx cypress run --spec "cypress/e2e-screenshot-scripts/trog_smart_capture.cy.js" --headless --browser chrome

echo ""
echo "✅ TROG capture completed!"
echo "📁 Screenshots saved in: cypress/screenshots/trog_smart_capture.cy.js/"
echo ""
echo "To view results:"
echo "ls -la cypress/screenshots/trog_smart_capture.cy.js/" 