// test-report-upload.js
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadReport() {
  try {
    // Path to example report
    const reportPath = path.join(__dirname, '../EXAMPLEREPORT.txt');
    
    // Read the file content
    console.log(`Reading file from ${reportPath}`);
    const fileContent = await fs.readFile(reportPath);
    
    // Create form data
    const form = new FormData();
    form.append('report', fileContent, {
      filename: 'EXAMPLEREPORT.txt',
      contentType: 'text/plain',
    });
    
    // Upload to API with port 5000 (server logs show it's running on 5000, not 3000)
    console.log('Uploading report to API...');
    const response = await fetch('http://localhost:5000/api/v1/reports/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
    
    // Get response as text first to examine it
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    // Try to parse the response if it's valid JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Upload response:');
      console.log(JSON.stringify(result, null, 2));
    } catch (jsonError) {
      console.error('Response is not valid JSON');
    }
    
    if (response.ok) {
      console.log('Report uploaded successfully!');
    } else {
      console.error(`Failed to upload report: Status ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error during upload:', error);
  }
}

// Run the upload function
uploadReport(); 