#!/bin/bash

# Theory of Mind 240 Frames Capture Script
echo "🧠 Starting Theory of Mind 240 Frames Capture..."
echo "⏱️  This will take approximately 10 minutes to capture all 240 frames"
echo "📸 Screenshots will be saved to: cypress/screenshots/theory-of-mind_240_frames.cy.js/"

# Clean up previous screenshots
rm -rf cypress/screenshots/theory-of-mind_240_frames.cy.js/

# Run the test
npx cypress run --spec "cypress/e2e-screenshot-scripts/theory-of-mind_240_frames.cy.js" --browser chrome --headed

echo "✅ Theory of Mind 240 frames capture completed!"
echo "📂 Check cypress/screenshots/theory-of-mind_240_frames.cy.js/ for all 240 screenshots" 