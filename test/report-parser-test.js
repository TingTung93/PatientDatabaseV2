// Test script for reportParser with EXAMPLEREPORT.txt
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Use this for ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the parser - adjust path as needed
// Try to import from both possible locations
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

async function runTest() {
  try {
    // Read the example report
    const reportPath = path.join(__dirname, '../EXAMPLEREPORT.txt');
    const reportContent = await fs.readFile(reportPath, 'utf8');
    
    console.log('Successfully read EXAMPLEREPORT.txt');
    console.log('Report length:', reportContent.length, 'characters');
    
    // Check for specific patterns in the content
    const firstLines = reportContent.split('\n').slice(0, 20).join('\n');
    console.log('\nFirst 20 lines of report:');
    console.log(firstLines);

    // Check for facility ID pattern
    const facilityIdMatch = /^\s*(\d{4}-BB)/.exec(reportContent);
    console.log('\nFacility ID pattern match:', facilityIdMatch ? facilityIdMatch[1] : 'No match');

    // Check for facility code pattern
    const facilityMatch = /Facility:\s*(\d{4}[A-Z])/.exec(reportContent);
    console.log('Facility code pattern match:', facilityMatch ? facilityMatch[1] : 'No match');
    
    // Parse the report
    console.log('\nParsing report...');
    const parsedReport = await parseReport(reportContent);
    
    // Output the results
    console.log('\n--- PARSED REPORT RESULTS ---');
    console.log('Metadata:', JSON.stringify(parsedReport.metadata, null, 2));
    console.log(`Patients found: ${parsedReport.patients.length}`);
    
    // Print details of first few patients
    console.log('\nFirst 3 patients:');
    parsedReport.patients.slice(0, 3).forEach((patient, index) => {
      console.log(`\nPatient ${index + 1}:`);
      console.log(`Name: ${patient.firstName} ${patient.lastName}`);
      console.log(`MRN: ${patient.medicalRecordNumber}`);
      console.log(`DOB: ${patient.dateOfBirth instanceof Date ? patient.dateOfBirth.toISOString().split('T')[0] : patient.dateOfBirth}`);
      console.log(`Blood Type: ${patient.bloodType}`);
      console.log(`Comments: ${JSON.stringify(patient.comments)}`);
    });
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest();
