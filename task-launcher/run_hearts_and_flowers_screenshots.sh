#!/bin/bash

echo "🎯 Running Hearts and Flowers Screenshot Capture..."
echo "📸 This will capture screenshots of the Hearts and Flowers task progression"
echo ""

# Run the Hearts and Flowers screenshot capture test
npx cypress run --spec "cypress/e2e-screenshot-scripts/hearts-and-flowers_helpers_pattern.cy.js" --browser chrome --headless

echo ""
echo "✅ Hearts and Flowers screenshot capture completed!"
echo "📁 Screenshots saved to: cypress/screenshots/hearts-and-flowers_helpers_pattern.cy.js/"
echo ""
echo "🔍 To view the screenshots:"
echo "   ls -la cypress/screenshots/hearts-and-flowers_helpers_pattern.cy.js/" 