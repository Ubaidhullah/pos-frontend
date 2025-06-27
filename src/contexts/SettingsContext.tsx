import React, { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Spin } from 'antd';
import { GET_SETTINGS } from '../apollo/queries/settingsQueries';

// Define the shape of your settings data
// This should include all globally relevant settings
interface AppSettings {
  baseCurrency: string;
  displayCurrency?: string;
  pricesEnteredWithTax: boolean;
  // Add other settings like loyaltyEnabled, etc., as needed
}

// Create the context
const SettingsContext = createContext<AppSettings | undefined>(undefined);

// Create the provider component that will wrap your app
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { data, loading, error } = useQuery<{ settings: AppSettings }>(GET_SETTINGS);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading Configuration..." />
      </div>
    );
  }
  
  if (error) {
    console.error("Failed to load application settings:", error);
    return <div>Error: Could not load application configuration. Please try again later.</div>;
  }

  // Provide safe defaults in case settings are not yet saved in the database
  const settings = data?.settings || {
    baseCurrency: 'USD',
    pricesEnteredWithTax: false,
  };

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};

// Create a custom hook to make it easy for components to get the settings
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return { settings: context }; // Return as { settings: ... } for consistency
};