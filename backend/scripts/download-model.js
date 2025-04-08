const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const MODEL_URL = 'https://huggingface.co/microsoft/trocr-base-handwritten/resolve/main/pytorch_model.bin';
const MODEL_DIR = path.join(__dirname, '../models/trocr-base-handwritten');

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

        const modelPath = path.join(MODEL_DIR, 'pytorch_model.bin');

        // Check if model already exists
        if (fs.existsSync(modelPath)) {
            console.log('Model already exists. Skipping download.');
            return;
        }

        console.log('Downloading TrOCR model...');
        await downloadFile(MODEL_URL, modelPath);
        console.log('Model downloaded successfully!');

        // Convert model to ONNX format for better performance
        console.log('Converting model to ONNX format...');
        exec('python -c "import torch; from transformers import TrOCRProcessor, VisionEncoderDecoderModel; model = VisionEncoderDecoderModel.from_pretrained(\'microsoft/trocr-base-handwritten\'); processor = TrOCRProcessor.from_pretrained(\'microsoft/trocr-base-handwritten\'); torch.onnx.export(model, (torch.randn(1, 3, 384, 384),), \'model.onnx\', input_names=[\'input\'], output_names=[\'output\'], dynamic_axes={\'input\': {0: \'batch_size\'}, \'output\': {0: \'batch_size\'}})"', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error converting model: ${error}`);
                return;
            }
            console.log('Model converted successfully!');
        });

    } catch (error) {
        console.error('Error setting up model:', error);
        process.exit(1);
    }
}

setupModel(); 