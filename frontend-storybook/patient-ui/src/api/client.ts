import axios from 'axios';
import { environment } from '../config/environment';

// Log the API URL being used
console.log('API URL:', environment.api.baseUrl);

const client = axios.create({
  baseURL: environment.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    // Add Authorization header setup here if/when authentication is added
    // 'Authorization': `Bearer ${token}`
  },
});

// Optional: Response interceptor for global error handling (as suggested in docs)
client.interceptors.response.use(
  response => response, // Pass through successful responses
  error => {
    // Log error or handle specific error codes globally
    console.error('API Error:', error.response || error.message || error);

    // You could potentially trigger a global error state update here

    // Reject the promise to propagate the error for component-level handling
    return Promise.reject(error);
  }
);

export default client;
