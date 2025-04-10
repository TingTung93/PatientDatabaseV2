import { adaptPatientForFrontend } from './src/utils/data-adapters.js';

// Create a mock patient with structure similar to what's in the database
const mockPatient = {
  id: "test123",
  first_name: "Test",
  last_name: "Patient",
  date_of_birth: "2000-01-01",
  gender: "Male",
  contact_number: null,
  email: null,
  address: null,
  emergency_contact: null,
  blood_type: null,
  allergies: null,
  medical_conditions: null,
  medications: null,
  notes: null,
  created_at: "2025-04-10 12:03:11",
  updated_at: "2025-04-10 12:03:11"
};

try {
  console.log('Adapting mock patient data...');
  const adaptedPatient = adaptPatientForFrontend(mockPatient);
  console.log('Adapted patient data:');
  console.log(JSON.stringify(adaptedPatient, null, 2));
  
  // Check for possible structure issues
  console.log('\nChecking adapted structure...');
  
  const requiredNested = ['identification', 'demographics', 'bloodProfile', 'medicalHistory'];
  for (const field of requiredNested) {
    if (!adaptedPatient[field]) {
      console.error(`Missing required field: ${field}`);
    } else {
      console.log(`✓ Found ${field}`);
      // Log the first level of properties
      const properties = Object.keys(adaptedPatient[field]);
      console.log(`  Properties: ${properties.join(', ')}`);
    }
  }
  
  // Check bloodProfile specific fields
  if (adaptedPatient.bloodProfile) {
    console.log(`Blood Type: ${adaptedPatient.bloodProfile.abo}${adaptedPatient.bloodProfile.rh}`);
  }
  
  console.log('\nTest completed successfully');
} catch (error) {
  console.error('Error in adapter test:', error.message);
  console.error(error.stack);
} 