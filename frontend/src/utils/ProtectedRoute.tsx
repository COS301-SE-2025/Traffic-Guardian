import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiKey = sessionStorage.getItem('apiKey');
  if (!apiKey) {
    return <Navigate to="/account" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;