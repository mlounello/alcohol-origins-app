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
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const savedSettings = localStorage.getItem('appSettings');
    if (!savedSettings) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } catch {
      console.error('Failed to parse saved settings');
      return DEFAULT_SETTINGS;
    }
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

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
