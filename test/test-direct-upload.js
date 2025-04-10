// test-direct-upload.js
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the parser
let parseReport;
try {
  const { parseReport: utilsParser } = await import('../backend/src/utils/reportParser.js');
  parseReport = utilsParser;
  console.log('Successfully imported parser from utils directory');
} catch (err) {
  console.log('Failed to import from utils, trying services directory:', err.message);
  try {
    const { parseReport: servicesParser } = await import('../backend/src/services/reportParser.js');
    parseReport = servicesParser;
    console.log('Successfully imported parser from services directory');
  } catch (err) {
    console.error('Failed to import parseReport from both locations:', err.message);
    process.exit(1);
  }
}

async function uploadParsedReport() {
  try {
    // Path to example report
    const reportPath = path.join(__dirname, '../EXAMPLEREPORT.txt');
    
    // Read the file content
    console.log(`Reading file from ${reportPath}`);
    const reportContent = await fs.readFile(reportPath, 'utf8');
    
    // Parse the report locally
    console.log('Parsing report locally...');
    const parsedReport = await parseReport(reportContent);
    
    console.log('Parsed report metadata:', JSON.stringify(parsedReport.metadata, null, 2));
    console.log(`Parsed ${parsedReport.patients.length} patients`);
    
    // Upload the parsed data to API
    console.log('Uploading parsed report to API...');
    const response = await fetch('http://localhost:5000/api/v1/reports/parsed', {
      method: 'POST',
      body: JSON.stringify(parsedReport),
      headers: {
        'Content-Type': 'application/json'
      },
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
uploadParsedReport(); 