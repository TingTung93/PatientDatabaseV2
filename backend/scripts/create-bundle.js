#!/usr/bin/env node
/**
 * Create Portable Bundle Script
 * 
 * This script creates a complete, bundled distribution of the backend
 * for portable deployment with all dependencies included.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const BUNDLE_DIR = path.join(ROOT_DIR, 'dist');
const PACKAGE_JSON = require(path.join(ROOT_DIR, 'package.json'));

console.log('Creating portable bundle for Patient Info App backend...');

// Clean previous bundle if exists
if (fs.existsSync(BUNDLE_DIR)) {
  console.log('Removing previous bundle...');
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}

// Create bundle directory
fs.mkdirSync(BUNDLE_DIR, { recursive: true });
console.log(`Created bundle directory: ${BUNDLE_DIR}`);

// Files to copy to the bundle
const filesToCopy = [
  { source: 'startup.js', dest: 'startup.js' },
  { source: 'start.ps1', dest: 'start.ps1' },
  { source: 'start.sh', dest: 'start.sh' },
  { source: 'PORTABLE_README.md', dest: 'README.md' },
  { source: '.env.portable', dest: '.env.portable' },
];

// Directories to copy
const dirsToCopy = [
  { source: 'src', dest: 'src' },
];

// Create a clean package.json for the bundle
const bundlePackageJson = {
  name: PACKAGE_JSON.name,
  version: PACKAGE_JSON.version,
  description: PACKAGE_JSON.description,
  main: PACKAGE_JSON.main,
  scripts: {
    start: "node startup.js"
  },
  dependencies: PACKAGE_JSON.dependencies,
  engines: PACKAGE_JSON.engines
};

// Write the bundle package.json
fs.writeFileSync(
  path.join(BUNDLE_DIR, 'package.json'),
  JSON.stringify(bundlePackageJson, null, 2)
);
console.log('Created bundle package.json');

// Copy selected files
filesToCopy.forEach(file => {
  const sourcePath = path.join(ROOT_DIR, file.source);
  const destPath = path.join(BUNDLE_DIR, file.dest);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied: ${file.source} -> ${file.dest}`);
  } else {
    console.warn(`Warning: Source file not found: ${sourcePath}`);
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  const sourcePath = path.join(ROOT_DIR, dir.source);
  const destPath = path.join(BUNDLE_DIR, dir.dest);
  
  if (fs.existsSync(sourcePath)) {
    // Create the directory
    fs.mkdirSync(destPath, { recursive: true });
    
    // Copy directory content recursively
    copyDirRecursive(sourcePath, destPath);
    console.log(`Copied directory: ${dir.source} -> ${dir.dest}`);
  } else {
    console.warn(`Warning: Source directory not found: ${sourcePath}`);
  }
});

// Create data directory structure in bundle
const bundleDataDir = path.join(BUNDLE_DIR, 'data');
const bundleLogsDir = path.join(bundleDataDir, 'logs');

fs.mkdirSync(bundleDataDir, { recursive: true });
fs.mkdirSync(bundleLogsDir, { recursive: true });
console.log('Created data directory structure');

// Install production dependencies in the bundle
console.log('Installing production dependencies (this may take a while)...');
try {
  execSync('npm install --production', { 
    cwd: BUNDLE_DIR,
    stdio: 'inherit'
  });
  console.log('Dependencies installed successfully');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}

// Make scripts executable in bundle
if (process.platform !== 'win32') {
  try {
    execSync('chmod +x startup.js start.sh', { 
      cwd: BUNDLE_DIR,
      stdio: 'inherit'
    });
    console.log('Made scripts executable');
  } catch (error) {
    console.warn('Warning: Could not make scripts executable:', error.message);
  }
}

// Create the ZIP archive (if zip command is available)
try {
  const zipFileName = `patient-info-backend-portable-v${PACKAGE_JSON.version}.zip`;
  const zipFilePath = path.join(ROOT_DIR, zipFileName);
  
  console.log(`Creating ZIP archive: ${zipFileName}`);
  
  if (process.platform === 'win32') {
    // Use PowerShell for Windows
    execSync(
      `powershell -Command "Compress-Archive -Path '${BUNDLE_DIR}\\*' -DestinationPath '${zipFilePath}' -Force"`, 
      { stdio: 'inherit' }
    );
  } else {
    // Use zip for Unix-like systems
    execSync(`zip -r "${zipFilePath}" *`, { 
      cwd: BUNDLE_DIR,
      stdio: 'inherit'
    });
  }
  
  console.log(`ZIP archive created: ${zipFilePath}`);
} catch (error) {
  console.warn('Warning: Could not create ZIP archive:', error.message);
  console.log(`Use the directory instead: ${BUNDLE_DIR}`);
}

console.log('Portable bundle created successfully!');
console.log(`Bundle location: ${BUNDLE_DIR}`);

// Helper function to copy directories recursively
function copyDirRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}