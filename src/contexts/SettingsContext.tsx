import React, { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Spin, Alert } from 'antd';
import { GET_SETTINGS } from '../apollo/queries/settingsQueries';
import { useAuth } from './AuthContext'; // Import the useAuth hook

// Define a type for your settings object for better type safety
interface AppSettings {
  displayCurrency?: string;
  baseCurrency?: string;
  pricesEnteredWithTax?: boolean;
  // Add any other settings fields you have
}

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  loading: true,
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // --- THE FIX IS HERE ---
  // We use the `skip` option to prevent this query from running automatically.
  // It will only run if the user is authenticated and the auth check is complete.
  const { data, loading: settingsLoading, error } = useQuery<{ settings: AppSettings }>(GET_SETTINGS, {
    skip: !isAuthenticated,
  });

  // The overall loading state is true if auth is still loading OR if settings are loading
  const isLoading = isAuthLoading || (isAuthenticated && settingsLoading);

  if (isLoading) {
    // You can show a full-page loader here if desired
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Loading Configuration..."/></div>;
  }
  
  if (error && isAuthenticated) {
    // If we are logged in but settings fail, show an error message.
    // This prevents the entire application from crashing.
    console.error("Failed to load application settings:", error);
    return (
        <div style={{ padding: '50px' }}>
            <Alert 
                message="Error" 
                description="Could not load application configuration. Please try again later." 
                type="error" 
                showIcon 
            />
        </div>
    );
  }
  
  const value = {
    settings: data?.settings || null,
    loading: isLoading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
