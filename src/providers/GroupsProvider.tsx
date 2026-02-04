'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { BeverageGroupConfig } from '@/types/database';
import { setGroupColors, setBeverageGroups, DEFAULT_GROUP_COLORS, DEFAULT_BEVERAGE_GROUPS } from '@/lib/constants';

interface GroupsContextType {
  groups: BeverageGroupConfig[];
  groupNames: string[];
  groupColors: Record<string, string>;
  isLoading: boolean;
  refreshGroups: () => Promise<void>;
  getGroupColor: (groupName: string) => string;
  getGroupDescription: (groupName: string) => string;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<BeverageGroupConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data: BeverageGroupConfig[] = await response.json();
        setGroups(data);

        // Update the mutable constants so all components get updated colors
        const colorsMap: Record<string, string> = {};
        const names: string[] = [];
        data.forEach((g) => {
          colorsMap[g.name] = g.color;
          names.push(g.name);
        });

        setGroupColors(colorsMap);
        setBeverageGroups(names);
      } else {
        // Fallback to defaults if API fails
        console.warn('Failed to fetch groups, using defaults');
        setGroupColors(DEFAULT_GROUP_COLORS);
        setBeverageGroups(DEFAULT_BEVERAGE_GROUPS);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroupColors(DEFAULT_GROUP_COLORS);
      setBeverageGroups(DEFAULT_BEVERAGE_GROUPS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const groupNames = groups.map((g) => g.name);

  const groupColors: Record<string, string> = {};
  groups.forEach((g) => {
    groupColors[g.name] = g.color;
  });

  const getGroupColor = useCallback((groupName: string) => {
    const group = groups.find((g) => g.name === groupName);
    return group?.color || '#808080';
  }, [groups]);

  const getGroupDescription = useCallback((groupName: string) => {
    const group = groups.find((g) => g.name === groupName);
    return group?.description || '';
  }, [groups]);

  return (
    <GroupsContext.Provider
      value={{
        groups,
        groupNames,
        groupColors,
        isLoading,
        refreshGroups: fetchGroups,
        getGroupColor,
        getGroupDescription,
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupsContext);
  if (context === undefined) {
    throw new Error('useGroups must be used within a GroupsProvider');
  }
  return context;
}
