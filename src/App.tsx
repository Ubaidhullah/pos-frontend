import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';

import client from './apollo/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './guards/ProtectedRoute';

import LoginPage from './features/auth/LoginPage';
import PosInterfacePage from './features/pos/PosInterfacePage';
import ProductListPage from './features/products/ProductListPage';
import CustomerListPage from './features/customers/CustomerListPage';
import OrderListPage from './features/orders/OrderListPage';
import UserListPage from './features/users/UserListPage';
import InventoryPage from './features/inventory/InventoryPage';
import CategoryListPage from './features/categories/CategoryListPage';
import DashboardPage from './features/dashboard/DashboardPage';
import ReportingPage from './features/reporting/ReportingPage';

import { Role } from './common/enums/role.enum';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading application...</div>;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/unauthorized"
        element={
          <div>
            <h1>Unauthorized</h1>
            <p>You do not have access to this page.</p>
          </div>
        }
      />

      {/* Authenticated Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="pos" element={<PosInterfacePage />} />
          <Route path="orders" element={<OrderListPage />} />
          <Route path="customers" element={<CustomerListPage />} />

          {/* Role Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]} />}>
            <Route path="admin/products" element={<ProductListPage />} />
            <Route path="admin/categories" element={<CategoryListPage />} />
            <Route path="admin/inventory" element={<InventoryPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN]} />}>
            <Route path="admin/users" element={<UserListPage />} />
          </Route>

          <Route path="reports" element={<ReportingPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      {/* Catch-all for unauthenticated users */}
      {!isAuthenticated && <Route path="*" element={<Navigate to="/login" replace />} />}
    </Routes>
  );
};

const App: React.FC = () => (
  <ApolloProvider client={client}>
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  </ApolloProvider>
);

export default App;
