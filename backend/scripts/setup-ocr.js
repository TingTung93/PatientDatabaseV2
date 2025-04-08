const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);

const MODEL_DIR = path.join(__dirname, '../models/trocr-base-handwritten');
const MODEL_FILES = {
    'config.json': 'https://huggingface.co/microsoft/trocr-base-handwritten/raw/main/config.json',
    'tokenizer.json': 'https://huggingface.co/microsoft/trocr-base-handwritten/raw/main/tokenizer.json',
    'model.onnx': 'https://huggingface.co/microsoft/trocr-base-handwritten/resolve/main/model.onnx'
};

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', err => {
            fs.unlink(dest, () => {}); // Delete the file if there was an error
            reject(err);
        });
    });
}

async function setupModel() {
    try {
        // Create model directory if it doesn't exist
        if (!fs.existsSync(MODEL_DIR)) {
            fs.mkdirSync(MODEL_DIR, { recursive: true });
        }

        // Download model files
        for (const [filename, url] of Object.entries(MODEL_FILES)) {
            const filePath = path.join(MODEL_DIR, filename);
            
            if (fs.existsSync(filePath)) {
                console.log(`${filename} already exists. Skipping download.`);
                continue;
            }

            console.log(`Downloading ${filename}...`);
            await downloadFile(url, filePath);
            console.log(`${filename} downloaded successfully!`);
        }

        // Create a model info file
        const modelInfo = {
            name: 'trocr-base-handwritten',
            version: '1.0.0',
            type: 'onnx',
            inputShape: [1, 3, 384, 384],
            outputShape: [1, 128],
            lastUpdated: new Date().toISOString()
        };

        await writeFile(
            path.join(MODEL_DIR, 'model-info.json'),
            JSON.stringify(modelInfo, null, 2)
        );

        console.log('OCR model setup completed successfully!');

    } catch (error) {
        console.error('Error setting up OCR model:', error);
        process.exit(1);
    }
}

setupModel(); 