#!/bin/bash

# Exit on error
set -e

echo "Starting OCR Integration Test..."

# 1. Setup Python environment
echo "Setting up Python environment..."
chmod +x setup_python_env.sh
./setup_python_env.sh

# 2. Create test data directory if it doesn't exist
mkdir -p test_data

# 3. Copy sample caution card if it exists
if [ -f "../form_ocr/test_data/sample_caution_card.jpg" ]; then
    echo "Copying sample caution card..."
    cp "../form_ocr/test_data/sample_caution_card.jpg" test_data/
else
    echo "Warning: Sample caution card not found. Please add a test image to test_data/sample_caution_card.jpg"
    exit 1
fi

# 4. Run Node.js integration test
echo "Running Node.js integration test..."
node scripts/test_ocr_integration.js

echo "Integration test completed!" 