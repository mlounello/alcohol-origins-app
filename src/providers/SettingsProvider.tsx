'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppSettings {
  // Map settings
  defaultMapStyle: 'street' | 'light' | 'satellite' | 'dark';
  defaultZoom: number;
  defaultCenter: { lat: number; lng: number };
  showFamilyTreeLines: boolean;
  showLegend: boolean;

  // General settings
  siteName: string;
  siteDescription: string;
  allowPublicViewing: boolean;
  requireLoginToView: boolean;

  // Data settings
  autoBackupEnabled: boolean;
  backupFrequencyDays: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultMapStyle: 'street',
  defaultZoom: 2,
  defaultCenter: { lat: 30, lng: 0 },
  showFamilyTreeLines: true,
  showLegend: true,
  siteName: 'Alcohol Origins Map',
  siteDescription: 'An interactive map exploring the history and origins of alcoholic beverages',
  allowPublicViewing: true,
  requireLoginToView: false,
  autoBackupEnabled: false,
  backupFrequencyDays: 7,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Failed to parse saved settings');
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('appSettings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
