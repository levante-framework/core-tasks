#!/bin/bash

# Same-Different Selection Auto Click Capture Script
echo "🔄 Starting Same-Different Selection Auto Click Capture..."
echo "🤖 This version automatically clicks OK buttons when they become enabled"
echo "📸 Screenshots will be saved to: cypress/screenshots/same-different-selection_auto_click.cy.js/"

# Clean up previous screenshots
rm -rf cypress/screenshots/same-different-selection_auto_click.cy.js/

# Run the test
npx cypress run --spec "cypress/e2e-screenshot-scripts/same-different-selection_auto_click.cy.js" --browser chrome --headed

echo "✅ Same-Different Selection auto-click capture completed!"
echo "📂 Check cypress/screenshots/same-different-selection_auto_click.cy.js/ for screenshots" 