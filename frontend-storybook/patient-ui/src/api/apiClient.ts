import axios, { AxiosError } from 'axios';
import { environment } from '../config/environment';

// Log the API URL being used
console.log('API URL:', environment.api.baseUrl);

// Helper function to get CSRF token from cookies
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export const apiClient = axios.create({
  baseURL: environment.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Send cookies with requests
});

// Add request interceptor for authentication AND CSRF token
apiClient.interceptors.request.use(
  config => {
    // 1. Add Auth Token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Add CSRF Token for non-GET/HEAD/OPTIONS requests
    const method = config.method?.toUpperCase();
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = getCookie('csrf_token');
      if (csrfToken) {
        config.headers[environment.security.csrfHeaderName] = csrfToken;
      }
    }

    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      switch (error.response.status) {
        case 401:
          // Handle unauthorized access
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          // Handle forbidden access
          console.error('Access forbidden:', error.response.data);
          break;
        case 404:
          // Handle not found
          console.error('Resource not found:', error.response.data);
          break;
        case 500:
          // Handle server error
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error - no response received:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);
