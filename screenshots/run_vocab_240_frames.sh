#!/bin/bash

# Vocabulary 240 Frames Capture Script
echo "📚 Starting Vocabulary 240 Frames Capture..."
echo "⏱️  This will take approximately 10 minutes to capture all 240 frames"
echo "📸 Screenshots will be saved to: cypress/screenshots/vocab_240_frames.cy.js/"

# Clean up previous screenshots
rm -rf cypress/screenshots/vocab_240_frames.cy.js/

# Run the test
npx cypress run --spec "cypress/e2e-screenshot-scripts/vocab_240_frames.cy.js" --browser chrome --headed

echo "✅ Vocabulary 240 frames capture completed!"
echo "📂 Check cypress/screenshots/vocab_240_frames.cy.js/ for all 240 screenshots" 