#!/bin/bash

echo "🧠 Running Memory Game Screenshot Capture..."
echo "Make sure the dev server is running at http://localhost:8080"

# Run the Memory game capture
npx cypress run --spec "cypress/e2e-screenshot-scripts/memory_simple_pattern.cy.js" --browser chrome --headless

echo "✅ Memory game capture completed!"
echo "📁 Check cypress/screenshots/memory_simple_pattern.cy.js/ for screenshots" 