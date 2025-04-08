import axios, { AxiosError, AxiosInstance } from 'axios';

// Get the API URL from environment variables or use default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

console.log('API URL:', API_URL);

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Assuming token is stored in localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Error in request configuration
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient; 