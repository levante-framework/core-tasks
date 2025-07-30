#!/bin/bash

# Script to upload golden-runs folder to Google Cloud Storage
# Bucket: levante-images-dev

echo "🚀 Starting upload of golden-runs folder to Google Cloud Storage..."
echo "📦 Bucket: gs://levante-images-dev/"
echo "📁 Source: ./golden-runs/"
echo "📊 Files: $(find golden-runs -name "*.png" | wc -l) PNG files"
echo "💾 Size: $(du -sh golden-runs | cut -f1)"
echo ""

# Check if gcloud is authenticated
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
    echo "❌ Not authenticated with gcloud. Please run:"
    echo "   gcloud auth application-default login"
    exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Check if bucket exists and is accessible
echo "🗂️  Checking bucket access..."
if ! gsutil ls gs://levante-images-dev/ >/dev/null 2>&1; then
    echo "❌ Cannot access bucket gs://levante-images-dev/"
    echo "   Please check your permissions or bucket name"
    exit 1
fi

echo "✅ Bucket accessible"
echo ""

# Upload the golden-runs folder
echo "📤 Starting upload..."
echo "   This may take several minutes for 824 files (~109MB)..."

# Use gsutil to upload with parallel processing for faster upload
# -m enables parallel uploads
# -r uploads recursively
gsutil -m cp -r golden-runs gs://levante-images-dev/

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Upload completed successfully!"
    echo ""
    echo "📋 Verification:"
    echo "   Checking uploaded files..."
    
    # Count uploaded files
    UPLOADED_COUNT=$(gsutil ls -r gs://levante-images-dev/golden-runs/ | grep '\.png$' | wc -l)
    LOCAL_COUNT=$(find golden-runs -name "*.png" | wc -l)
    
    echo "   Local files:    $LOCAL_COUNT"
    echo "   Uploaded files: $UPLOADED_COUNT"
    
    if [ "$LOCAL_COUNT" -eq "$UPLOADED_COUNT" ]; then
        echo "   ✅ File counts match!"
    else
        echo "   ⚠️  File counts don't match. Please verify manually."
    fi
    
    echo ""
    echo "🔗 Access your files at:"
    echo "   https://console.cloud.google.com/storage/browser/levante-images-dev/golden-runs"
    
else
    echo ""
    echo "❌ Upload failed!"
    echo "   Please check your permissions and try again"
    exit 1
fi