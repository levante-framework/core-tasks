#!/bin/bash

echo "🧹 Cleaning up existing servers..."

# Kill any existing webpack dev servers
pkill -f "webpack serve" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Kill processes on ports 8080 and 8081
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

echo "✅ Cleanup complete"

# Navigate to the correct directory
cd "$(dirname "$0")"

echo "📁 Starting server from: $(pwd)"

# Check if we have the correct package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in current directory"
    echo "Make sure you're in the task-launcher directory"
    exit 1
fi

# Check if npm run dev is available
if ! npm run 2>&1 | grep -q "dev"; then
    echo "❌ Error: 'npm run dev' script not found"
    echo "Available scripts:"
    npm run
    exit 1
fi

echo "🚀 Starting webpack dev server..."
echo "Server will be available at: http://localhost:8080/"

# Start the server
npm run dev 