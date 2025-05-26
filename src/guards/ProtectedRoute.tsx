import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../common/enums/role.enum';
import { Spin } from 'antd';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" tip="Authenticating..." />
        </div>
      );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    // User is authenticated but does not have the required role
    return <Navigate to="/unauthorized" replace />; // Or a specific "Access Denied" page
  }

  return <Outlet />; // Render the child route components
};

export default ProtectedRoute;