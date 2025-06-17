import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Role } from '../common/enums/role.enum'; // Create this enum on the frontend too
import client from '../apollo/client'; // Your Apollo Client instance

// Frontend Role Enum (should match backend)
// src/common/enums/role.enum.ts (frontend)
// export enum Role {
//   USER = 'USER',
//   CASHIER = 'CASHIER',
//   MANAGER = 'MANAGER',
//   ADMIN = 'ADMIN',
// }


interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  companyId: string; 
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
  isLoading: boolean; // To handle initial auth check
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState(true); // Start as true

  // Persist token, load user info if token exists on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userData: AuthUser) => {
    localStorage.setItem('accessToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
    client.resetStore(); // Clear Apollo Client cache on logout
    // Optionally redirect to login page: navigate('/login'); (if using useNavigate hook)
  };

  const hasRole = (roles: Role[]): boolean => {
    if (!user || !user.role) {
      return false;
    }
    return roles.includes(user.role);
  };


  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token && !!user, user, token, login, logout, isLoading, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};