#!/bin/bash
# Patient Info App Backend - Portable Startup Script (Unix/Linux/macOS)
# This script launches the backend server with SQLite database

echo -e "\033[1;36mStarting Patient Info App Backend...\033[0m"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "\033[1;31mError: Node.js is not installed or not in PATH\033[0m"
    echo -e "\033[1;31mPlease install Node.js from https://nodejs.org/\033[0m"
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

node_version=$(node -v)
echo -e "\033[1;32mNode.js version: $node_version\033[0m"

# Set the current directory to the script location
cd "$(dirname "$0")" || exit 1

# Make the script executable
chmod +x startup.js

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "\033[1;33mInstalling dependencies (this may take a few minutes)...\033[0m"
    npm install --production
    
    if [ $? -ne 0 ]; then
        echo -e "\033[1;31mError installing dependencies\033[0m"
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi
    
    echo -e "\033[1;32mDependencies installed successfully\033[0m"
fi

# Start the server using the startup script
echo -e "\033[1;36mLaunching backend server...\033[0m"
node startup.js

# Keep the window open if there's an error
if [ $? -ne 0 ]; then
    echo -e "\033[1;31mServer exited with error code: $?\033[0m"
    read -n 1 -s -r -p "Press any key to exit..."
fi