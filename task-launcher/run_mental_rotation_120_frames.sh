#!/bin/bash

# Mental Rotation 120 Frames Capture Script
echo "🧠 Starting Mental Rotation 120 Frames Capture..."
echo "⏱️  This will take approximately 6-7 minutes to capture all 120 frames"
echo "📸 Screenshots will be saved to: cypress/screenshots/mental-rotation_120_frames.cy.js/"

# Clean up previous screenshots
rm -rf cypress/screenshots/mental-rotation_120_frames.cy.js/

# Run the test
npx cypress run --spec "cypress/e2e-screenshot-scripts/mental-rotation_120_frames.cy.js" --browser chrome --headed

echo "✅ Mental Rotation 120 frames capture completed!"
echo "📂 Check cypress/screenshots/mental-rotation_120_frames.cy.js/ for all 120 screenshots" 