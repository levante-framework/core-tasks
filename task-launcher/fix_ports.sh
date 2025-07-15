#!/bin/bash

echo "🔧 Fixing port references from 8080 to 8081 in all Cypress test files..."

# Find and replace in all .cy.js files
find . -name "*.cy.js" -type f -exec sed -i 's/localhost:8080/localhost:8081/g' {} +

echo "✅ Port fix complete! All Cypress tests now use port 8081"

# Show a summary of what was changed
echo "📊 Files that were updated:"
find . -name "*.cy.js" -type f -exec grep -l "localhost:8081" {} + | wc -l | xargs echo "Total files with correct port:"

# Verify the change worked
echo ""
echo "🔍 Verification - checking for any remaining 8080 references:"
remaining=$(find . -name "*.cy.js" -type f -exec grep -l "localhost:8080" {} + 2>/dev/null | wc -l)
if [ "$remaining" -eq 0 ]; then
    echo "✅ All port references successfully updated!"
else
    echo "⚠️  Found $remaining files still using port 8080:"
    find . -name "*.cy.js" -type f -exec grep -l "localhost:8080" {} + 2>/dev/null
fi 