import React, { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactElement;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallbackPath = '/login' 
}) => {
  // For now, we'll assume the user is always authenticated
  // TODO: Implement actual authentication check
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  return React.cloneElement(children);
}; 