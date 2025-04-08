import { authService, LoginCredentials, AuthResponse, UserProfile } from '../authService'; // Adjust path as needed
import { apiClient } from '../../api/apiClient'; // Adjust path as needed

// Mock the apiClient
jest.mock('../../api/apiClient');

// Create a typed mock instance
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('authService', () => {

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  // --- login --- 
  it('login should call apiClient.post with credentials and return auth response', async () => {
    const credentials: LoginCredentials = { username: 'testuser', password: 'password123' };
    const mockAuthResponse: AuthResponse = { 
        token: 'fake-jwt-token', 
        user: { id: 'user-1', username: 'testuser', role: 'user' } 
    };
    mockApiClient.post.mockResolvedValueOnce({ data: mockAuthResponse });

    const result = await authService.login(credentials);

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', credentials); // Verify endpoint and data
    expect(result).toEqual(mockAuthResponse);
  });

  it('login should handle API errors', async () => {
    const credentials: LoginCredentials = { username: 'testuser', password: 'wrongpassword' };
    const mockError = new Error('Invalid credentials');
    // Simulate an error response from axios if needed, e.g., { response: { status: 401 } }
    mockApiClient.post.mockRejectedValueOnce(mockError); 

    await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', credentials);
  });

  // --- logout --- 
  it('logout should call apiClient.post to the logout endpoint', async () => {
    // Mock a successful response (even if it's just a 2xx status)
    mockApiClient.post.mockResolvedValueOnce({ status: 200 });

    await authService.logout();

    expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout'); // Verify endpoint
  });
  
  it('logout should not throw an error if the API call fails (optional behavior)', async () => {
      const mockError = new Error('Logout endpoint not found');
      mockApiClient.post.mockRejectedValueOnce(mockError); 
  
      // Using await/expect().not.toThrow() as it completes even if the internal promise rejects
      await expect(authService.logout()).resolves.toBeUndefined(); 
      // Or check console.warn was called if that's the desired behavior
  
      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
    });

  // --- getMe --- 
  it('getMe should call apiClient.get and return user profile', async () => {
    const mockUserProfile: UserProfile = { id: 'user-1', username: 'testuser', role: 'admin' };
    mockApiClient.get.mockResolvedValueOnce({ data: mockUserProfile });

    const result = await authService.getMe();

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me'); // Verify endpoint
    expect(result).toEqual(mockUserProfile);
  });

  it('getMe should handle API errors', async () => {
      const mockError = new Error('Unauthorized');
      // Simulate an error response from axios if needed, e.g., { response: { status: 401 } }
      mockApiClient.get.mockRejectedValueOnce(mockError); 
  
      await expect(authService.getMe()).rejects.toThrow('Unauthorized');
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
    });

}); 