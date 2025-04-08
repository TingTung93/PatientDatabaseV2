import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, LoginCredentials, UserProfile, AuthResponse } from '../services/authService';
import { apiClient } from '../api/apiClient';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Use UserProfile from authService for consistency? Or keep separate User type?
// Assuming UserProfile is the intended type for the context user.
interface AuthContextType {
  user: UserProfile | null; // Use UserProfile type
  isAuthenticated: boolean; // Add isAuthenticated
  isLoading: boolean; // Add isLoading
  login: (credentials: LoginCredentials) => Promise<AuthResponse>; // Match return type of mutateAsync
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token')); // Initialize from localStorage

  // Update apiClient Authorization header when token changes
  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Query to fetch user profile if a token exists
  const {
    data: fetchedUser,
    isLoading: isLoadingUser,
    isError,
    refetch,
  } = useQuery<UserProfile, Error>({
    queryKey: ['currentUser'],
    queryFn: authService.getMe,
    enabled: !!token, // Only run if token exists
    retry: 1, // Don't retry indefinitely if token is invalid
    staleTime: Infinity, // Assume user data doesn't change unless logged out/in
    gcTime: Infinity, // Keep data indefinitely until invalidated
  });

  // Update local user state when query data changes
  useEffect(() => {
    if (fetchedUser) {
      setUser(fetchedUser);
    } else if (isError || !token) {
      // Clear user if error fetching or no token
      setUser(null);
    }
  }, [fetchedUser, isError, token]);

  // Login Mutation
  const loginMutation = useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: authService.login,
    onSuccess: data => {
      setToken(data.token);
      // If login response includes user data, set it immediately
      if (data.user) {
        setUser(data.user);
        queryClient.setQueryData(['currentUser'], data.user); // Seed the query cache
      } else {
        // If user data not included in login, refetch /me endpoint
        refetch();
      }
    },
    onError: error => {
      console.error('Login failed:', error);
      // Handle login errors (e.g., display message)
    },
  });

  // Logout Function
  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    queryClient.removeQueries({ queryKey: ['currentUser'] }); // Clear user data from cache
    // Optional: Invalidate other queries that depend on user data
    queryClient.invalidateQueries(); // Broad invalidation, refine if needed
    try {
      await authService.logout(); // Call backend logout if implemented
    } catch (error) {
      // Log or handle error if backend logout fails
      console.error('Backend logout failed:', error);
    }
  }, [queryClient]);

  // Handle 401 errors globally (could also be done in apiClient interceptor)
  useEffect(() => {
    if (isError) {
      // Assuming 401 error means token is invalid/expired
      console.log('Error fetching user, likely invalid token. Logging out.');
      logout();
    }
  }, [isError, logout]);

  const value = useMemo(
    () => ({
      user, // User state now holds UserProfile
      isAuthenticated: !!user,
      isLoading: isLoadingUser && !!token,
      login: loginMutation.mutateAsync, // This already expects LoginCredentials
      logout,
    }),
    [user, isLoadingUser, token, loginMutation.mutateAsync, logout]
  );

  // Show loading spinner only during the initial authentication check
  if (isLoadingUser && !!token && !user && !isError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner message="Authenticating..." />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
