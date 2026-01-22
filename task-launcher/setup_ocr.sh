#!/bin/bash
# Setup script for OCR-based screenshot cleanup

echo "🔧 Setting up OCR Screenshot Cleanup..."

# Install system dependencies
echo "📦 Installing system packages..."
if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    sudo apt-get update
    sudo apt-get install -y tesseract-ocr tesseract-ocr-eng python3-pip
elif command -v brew &> /dev/null; then
    # macOS
    brew install tesseract
elif command -v yum &> /dev/null; then
    # RHEL/CentOS
    sudo yum install -y tesseract python3-pip
else
    echo "⚠️  Please install tesseract-ocr manually for your system"
fi

# Install Python dependencies
echo "🐍 Installing Python packages..."
pip3 install -r requirements_ocr.txt

# Make script executable
chmod +x cleanup_screenshots_ocr.py

# Test installation
echo "🧪 Testing installation..."
python3 -c "import pytesseract; from PIL import Image; print('✅ OCR setup complete!')"

echo ""
echo "🎉 Setup complete! Usage examples:"
echo "   # Dry run (preview only):"
echo "   python3 cleanup_screenshots_ocr.py cypress/screenshots/memory_simple_complete.cy.js/"
echo ""
echo "   # Execute cleanup with 80% similarity threshold:"
echo "   python3 cleanup_screenshots_ocr.py cypress/screenshots/memory_simple_complete.cy.js/ --execute"
echo ""
echo "   # More aggressive cleanup (90% similarity):"
echo "   python3 cleanup_screenshots_ocr.py cypress/screenshots/memory_simple_complete.cy.js/ --similarity 0.9 --execute" 