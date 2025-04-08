const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../src/utils/logger');

const REQUIRED_PACKAGES = [
    'torch>=2.2.0',
    'transformers>=4.38.0',
    'opencv-python>=4.9.0.80',
    'Pillow>=10.2.0',
    'numpy>=1.24.3',
    'tqdm>=4.66.0'
];

async function setupVirtualEnv() {
    const isWindows = process.platform === 'win32';
    const rootDir = path.resolve(__dirname, '..');
    const venvPath = path.join(rootDir, 'venv');
    const pythonCmd = isWindows ? 'python' : 'python3';
    
    try {
        // Check if Python is installed
        const pythonCheck = spawnSync(pythonCmd, ['--version']);
        if (pythonCheck.status !== 0) {
            throw new Error(`${pythonCmd} is not installed or not in PATH`);
        }
        
        // Check if venv exists
        if (!fs.existsSync(venvPath)) {
            logger.info('Creating virtual environment...');
            const venvResult = spawnSync(pythonCmd, ['-m', 'venv', venvPath], {
                stdio: 'inherit',
                shell: true
            });
            if (venvResult.status !== 0) {
                throw new Error('Failed to create virtual environment. Please ensure you have venv module installed.');
            }
        }

        // Get the correct pip path
        const pythonPath = path.join(venvPath, isWindows ? 'Scripts\\python.exe' : 'bin/python');
        
        if (!fs.existsSync(pythonPath)) {
            throw new Error(`Python not found at ${pythonPath}. Virtual environment may be corrupted.`);
        }

        // Upgrade pip using python -m pip to avoid path issues
        logger.info('Upgrading pip...');
        const pipUpgrade = spawnSync(pythonPath, ['-m', 'pip', 'install', '--upgrade', 'pip'], {
            stdio: 'inherit',
            shell: true,
            cwd: rootDir // Ensure we're in the correct directory
        });
        
        if (pipUpgrade.status !== 0) {
            logger.error('Pip upgrade failed with status:', pipUpgrade.status);
            if (pipUpgrade.stderr) {
                logger.error('Pip upgrade stderr:', pipUpgrade.stderr.toString());
            }
            throw new Error('Failed to upgrade pip. Try running the script with administrator privileges.');
        }

        // Install required packages using python -m pip
        logger.info('Installing required packages...');
        const installResult = spawnSync(pythonPath, ['-m', 'pip', 'install', ...REQUIRED_PACKAGES], {
            stdio: 'inherit',
            shell: true,
            cwd: rootDir // Ensure we're in the correct directory
        });
        
        if (installResult.status !== 0) {
            logger.error('Package installation failed with status:', installResult.status);
            if (installResult.stderr) {
                logger.error('Package installation stderr:', installResult.stderr.toString());
            }
            throw new Error('Failed to install required packages. Check your internet connection and try again.');
        }

        // Verify installation
        logger.info('Verifying installation...');
        const verifyResult = spawnSync(pythonPath, [path.join(__dirname, 'verify_install.py')], {
            stdio: 'inherit',
            shell: true,
            cwd: rootDir // Ensure we're in the correct directory
        });
        
        if (verifyResult.status !== 0) {
            logger.error('Verification failed with status:', verifyResult.status);
            if (verifyResult.stderr) {
                logger.error('Verification stderr:', verifyResult.stderr.toString());
            }
            throw new Error('Failed to verify installation. Some packages may not have installed correctly.');
        }

        logger.info('Virtual environment setup completed successfully');
    } catch (error) {
        logger.error('Error setting up virtual environment:', error.message);
        if (error.stderr) {
            logger.error('Additional error details:', error.stderr.toString());
        }
        process.exit(1);
    }
}

// Run setup
setupVirtualEnv(); 