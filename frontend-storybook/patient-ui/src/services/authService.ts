import { apiClient } from '../api/apiClient';

// Define types based on your API spec
interface LoginCredentials {
  username: string; // or email
  password: string;
}

interface AuthResponse {
  token: string;
  // Potentially include user data here as well
  user?: UserProfile; 
}

// Example User Profile structure
interface UserProfile {
  id: string;
  username: string;
  role: string; // e.g., 'admin', 'user'
  // other fields...
}

export const authService = {
  /**
   * Logs in the user.
   * @param credentials - Username and password.
   * @returns AuthResponse containing token and potentially user data.
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Adjust endpoint as needed
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data; 
  },

  /**
   * Logs out the user.
   * Potentially invalidates the token on the backend.
   */
  logout: async (): Promise<void> => {
    // Adjust endpoint as needed. May not be necessary if backend relies on token expiry.
    try {
        await apiClient.post('/auth/logout');
    } catch (error) {
        console.warn("Logout API call failed (might be expected if token is just cleared client-side):", error);
    }
  },

  /**
   * Fetches the profile of the currently authenticated user using the token.
   * @returns UserProfile data.
   */
  getMe: async (): Promise<UserProfile> => {
    // Adjust endpoint as needed
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },
};

// Re-export types for convenience
export type { LoginCredentials, AuthResponse, UserProfile }; 