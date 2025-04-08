// frontend-storybook/patient-ui/src/services/apiClient.ts
import axios from 'axios';

// Determine the base URL based on the environment
const baseURL =
  process.env.NODE_ENV === 'production'
    ? '/api' // Production URL (relative path)
    : 'http://localhost:5000/api/v1'; // Development URL (CORRECTED)

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials if your API uses cookies/sessions
  // withCredentials: true,
});

// Optional: Add interceptors for request/response handling (e.g., auth tokens, error logging)
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Basic error logging
    console.error('API Error:', error.response?.data || error.message);

    // You might want to add more sophisticated error handling here
    // e.g., check for specific status codes (401, 403) and redirect to login

    return Promise.reject(error);
  }
);

export default apiClient;
