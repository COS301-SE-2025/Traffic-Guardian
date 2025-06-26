import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiKey = localStorage.getItem('apiKey');
  if (!apiKey) {
    return <Navigate to="/account" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;