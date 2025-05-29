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
// import other pages as you implement them
import { Role } from './common/enums/role.enum';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading application...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<div><h1>Unauthorized</h1><p>You do not have access to this page.</p></div>} />

      {/* Protected Routes under Main Layout */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<PosInterfacePage />} />

          {/* POS pages for multiple roles */}
          {/* Example: Orders, Customers */}
          
         <Route path="orders" element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER, Role.CASHIER]}><OrderListPage /></ProtectedRoute>} />
          <Route path="customers" element={<CustomerListPage />} />
         

          {/* Admin + Manager routes */}
          <Route path="admin/products" element={ 
              <ProductListPage />
          } />

         
          {/* <Route path="admin/categories" element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}><CategoryListPage /></ProtectedRoute>} /> */}
          <Route path="admin/inventory" element={<InventoryPage />} />
         

          
          <Route path="admin/users" element={
              <UserListPage />
          } />
          

          {/* Catch-all for authenticated users */}
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
