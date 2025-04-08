import React, { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  // Add roles prop if role-based access is needed
  // roles?: string[];
}

// ... existing code ... 