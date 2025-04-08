import React, { ReactNode } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../AuthContext'; // Adjust path
import {
  authService,
  LoginCredentials,
  UserProfile,
  AuthResponse,
} from '../../services/authService'; // Adjust path
import { apiClient } from '../../api/apiClient'; // To check headers if needed

// Mock the authService
jest.mock('../../services/authService');

// Create typed mock functions for service methods
const mockLogin = authService.login as jest.Mock;
const mockLogout = authService.logout as jest.Mock;
const mockGetMe = authService.getMe as jest.Mock;

// Mock localStorage
let store: Record<string, string> = {};
const localStorageMock = (() => {
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// --- Test Setup ---

// Helper component to consume and display context values
const TestConsumerComponent = () => {
  const auth = useAuth();
  return (
    <div>
      {/* Add null check for auth context */}
      {!auth && <div>Auth context not available</div>}
      {auth && (
        <>
          <div data-testid="is-loading">{auth.isLoading.toString()}</div>
          <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
          <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
          {/* Use username as expected by LoginCredentials */}
          <button onClick={() => auth.login({ username: 'test', password: 'pw' })}>Login</button>
          <button onClick={() => auth.logout()}>Logout</button>
        </>
      )}
    </div>
  );
};

// Helper function to render the Provider with the Consumer
const renderAuthProvider = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity }, // Match provider's config
      mutations: { retry: false },
    },
  });
  // Clear localStorage and apiClient headers before each render
  localStorage.clear();
  delete apiClient.defaults.headers.common['Authorization'];

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('AuthContext & useAuth', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    jest.clearAllMocks();
    store = {}; // Clear mock localStorage store
  });

  it('initial state should be loading=false, authenticated=false, user=null without token', () => {
    renderAuthProvider();
    expect(screen.getByTestId('is-loading').textContent).toBe('false');
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(mockGetMe).not.toHaveBeenCalled(); // getMe shouldn't be called without token
  });

  it('should attempt to fetch user if token exists in localStorage', async () => {
    localStorage.setItem('token', 'existing-token');
    const mockUser: UserProfile = { id: 'u1', username: 'cachedUser', role: 'user' }; // Matches UserProfile
    mockGetMe.mockResolvedValue(mockUser);

    renderAuthProvider();

    // Should be loading initially while fetching
    // Note: AuthProvider has its own loading state check, so we test the end state
    expect(screen.getByTestId('is-loading').textContent).toBe('true');

    // Wait for user fetch to complete
    await waitFor(() => expect(screen.getByTestId('is-loading').textContent).toBe('false'));

    expect(mockGetMe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
    expect(apiClient.defaults.headers.common['Authorization']).toBe('Bearer existing-token');
  });

  it('should handle error fetching user with existing token (e.g., invalid token)', async () => {
    localStorage.setItem('token', 'invalid-token');
    const mockError = new Error('Invalid token');
    mockGetMe.mockRejectedValue(mockError);

    renderAuthProvider();

    expect(screen.getByTestId('is-loading').textContent).toBe('true');

    // Wait for fetch attempt to fail and logout logic to run
    await waitFor(() => expect(screen.getByTestId('is-loading').textContent).toBe('false'));

    expect(mockGetMe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('token')).toBeNull(); // Token should be removed by logout
    expect(apiClient.defaults.headers.common['Authorization']).toBeUndefined();
    expect(mockLogout).toHaveBeenCalled(); // Logout should be called on fetch error
  });

  it('login should call authService.login, set token/user, and update state', async () => {
    const mockUser: UserProfile = { id: 'u2', username: 'newUser', role: 'admin' }; // Matches UserProfile
    const mockResponse: AuthResponse = { token: 'new-token', user: mockUser };
    mockLogin.mockResolvedValue(mockResponse);

    renderAuthProvider();
    const user = userEvent.setup();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /login/i }));
    });

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith({ username: 'test', password: 'pw' });
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(apiClient.defaults.headers.common['Authorization']).toBe('Bearer new-token');
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
  });

  it('login should refetch user if not included in login response', async () => {
    const mockUser: UserProfile = { id: 'u3', username: 'refetchedUser', role: 'user' }; // Matches UserProfile
    const mockLoginResponse: AuthResponse = { token: 'refetch-token' }; // No user data
    mockLogin.mockResolvedValue(mockLoginResponse);
    mockGetMe.mockResolvedValue(mockUser); // Mock getMe for refetch

    renderAuthProvider();
    const user = userEvent.setup();

    expect(mockGetMe).not.toHaveBeenCalled(); // Initially no token

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /login/i }));
    });

    expect(mockLogin).toHaveBeenCalledTimes(1);
    // getMe should be called after login success because user wasn't in response
    await waitFor(() => expect(mockGetMe).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem('token')).toBe('refetch-token');
    expect(apiClient.defaults.headers.common['Authorization']).toBe('Bearer refetch-token');
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe(JSON.stringify(mockUser));
  });

  it('logout should call authService.logout, clear token/user, and update state', async () => {
    // Setup initial logged-in state
    localStorage.setItem('token', 'logout-token');
    const mockUser: UserProfile = { id: 'u1', username: 'logoutUser', role: 'user' }; // Matches UserProfile
    mockGetMe.mockResolvedValue(mockUser);
    mockLogout.mockResolvedValue(undefined);

    renderAuthProvider();
    await waitFor(() => expect(screen.getByTestId('is-authenticated').textContent).toBe('true')); // Wait for initial load

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /logout/i }));
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(apiClient.defaults.headers.common['Authorization']).toBeUndefined();
    expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  // TODO: Add tests for login error handling (displaying errors to user)
});
