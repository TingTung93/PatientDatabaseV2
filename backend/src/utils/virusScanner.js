const net = require('net');
const { antivirus } = require('../config/upload.config');
const createError = require('http-errors');

class VirusScanner {
  constructor() {
    this.config = antivirus.clamav;
  }

  async scanFile(filePath) {
    if (!antivirus.enabled) {
      return { isClean: true, message: 'Virus scanning disabled' };
    }

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let response = Buffer.from('');

      socket.setTimeout(this.config.timeout);

      socket.on('error', (error) => {
        socket.destroy();
        reject(createError(500, `ClamAV connection error: ${error.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(createError(500, 'ClamAV scan timeout'));
      });

      socket.on('data', (data) => {
        response = Buffer.concat([response, data]);
      });

      socket.on('close', () => {
        const result = response.toString().trim();
        if (result.endsWith('OK')) {
          resolve({ isClean: true, message: 'File is clean' });
        } else if (result.includes('FOUND')) {
          resolve({ isClean: false, message: 'Malware detected' });
        } else {
          reject(createError(500, `Unexpected ClamAV response: ${result}`));
        }
      });

      socket.connect(this.config.port, this.config.host, () => {
        socket.write(`SCAN ${filePath}\n`);
      });
    });
  }
}

module.exports = new VirusScanner();