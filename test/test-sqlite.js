// test-sqlite.js
import fetch from 'node-fetch';

async function testSqlite() {
  try {
    console.log('Testing SQLite storage directly...');
    
    // Call the test endpoint
    const response = await fetch('http://localhost:5000/api/v1/reports/test-sqlite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    // Get response text
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    // Parse response if possible
    try {
      const result = JSON.parse(responseText);
      console.log('Response data:', result);
      
      if (response.ok) {
        console.log('Test successful!');
      } else {
        console.error('Test failed with status:', response.status);
      }
    } catch (err) {
      console.error('Error parsing response:', err);
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testSqlite(); 