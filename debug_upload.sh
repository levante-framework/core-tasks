#!/bin/bash

echo "🔍 Debugging Google Cloud Storage Access..."
echo ""

# Check if tools are working
echo "1. Checking gcloud installation..."
which gcloud
echo ""

echo "2. Checking gsutil installation..."
which gsutil
echo ""

echo "3. Checking authentication..."
gcloud auth list 2>/dev/null || echo "❌ gcloud auth failed"
echo ""

echo "4. Checking current account..."
ACCOUNT=$(gcloud config get-value account 2>/dev/null)
echo "Current account: $ACCOUNT"
echo ""

echo "5. Checking current project..."
PROJECT=$(gcloud config get-value project 2>/dev/null)
echo "Current project: $PROJECT"
echo ""

echo "6. Testing bucket access with curl (public read)..."
curl -s -I "https://storage.googleapis.com/levante-images-dev/" | head -5
echo ""

echo "7. Testing gsutil with verbose output..."
gsutil -D ls gs://levante-images-dev 2>&1 | head -20
echo ""

echo "8. Alternative: Try different bucket name patterns..."
echo "   Trying: gs://levante-images-dev/"
gsutil ls gs://levante-images-dev/ 2>&1 | head -5
echo ""

echo "9. List available buckets you have access to..."
gsutil ls 2>&1 | head -10
echo ""

echo "🏁 Debug complete. Check the output above for clues."