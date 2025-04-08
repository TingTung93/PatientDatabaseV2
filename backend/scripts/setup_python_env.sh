#!/bin/bash

# Exit on error
set -e

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "Creating resource directories..."
mkdir -p form_ocr/resources/templates
mkdir -p form_ocr/resources/masks
mkdir -p form_ocr/resources/coordinates
mkdir -p form_ocr/debug_output

# Copy template files if they exist
if [ -d "../form_ocr/resources" ]; then
    echo "Copying template files..."
    cp -r ../form_ocr/resources/* form_ocr/resources/
fi

# Set environment variables
echo "Setting up environment variables..."
cat > .env << EOL
PYTHON_PATH=$(which python3)
OCR_DEBUG=true
OCR_MODEL_PATH=form_ocr/models
EOL

echo "Python environment setup complete!"
echo "To activate the environment, run: source venv/bin/activate" 