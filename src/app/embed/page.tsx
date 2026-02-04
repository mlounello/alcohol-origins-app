'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Beverage, BeverageGroup } from '@/types/database';
import { EmbedMapContainer } from '@/components/map/EmbedMapContainer';
import { EmbedMapConfig } from '@/components/map/EmbedMapInner';
import { BEVERAGE_GROUPS } from '@/lib/constants';

function EmbedMapContent() {
  const searchParams = useSearchParams();

  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse configuration from URL parameters
  const config: EmbedMapConfig = useMemo(() => {
    const style = searchParams.get('style') as EmbedMapConfig['mapStyle'] || 'street';
    const zoom = parseInt(searchParams.get('zoom') || '2') || 2;
    const lat = parseFloat(searchParams.get('lat') || '30') || 30;
    const lng = parseFloat(searchParams.get('lng') || '0') || 0;
    const legend = searchParams.get('legend') !== 'false'; // default true
    const familyTree = searchParams.get('familytree') !== 'false'; // default true

    // Parse groups filter - comma-separated list of group names
    const groupsParam = searchParams.get('groups');
    let groups: string[] = [];
    if (groupsParam) {
      groups = groupsParam.split(',').filter((g) => BEVERAGE_GROUPS.includes(g as BeverageGroup));
    }

    return {
      mapStyle: ['street', 'light', 'satellite', 'dark'].includes(style) ? style : 'street',
      zoom: Math.max(1, Math.min(18, zoom)),
      center: { lat, lng },
      showFamilyTreeLines: familyTree,
      showLegend: legend,
      groups,
    };
  }, [searchParams]);

  // Fetch beverages
  useEffect(() => {
    async function fetchBeverages() {
      try {
        const response = await fetch('/api/beverages');
        if (!response.ok) {
          throw new Error('Failed to fetch beverages');
        }
        const data = await response.json();
        setBeverages(data);
      } catch (err) {
        console.error('Error fetching beverages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load beverages');
      } finally {
        setLoading(false);
      }
    }

    fetchBeverages();
  }, []);

  // Filter beverages by selected groups
  const filteredBeverages = useMemo(() => {
    if (config.groups.length === 0) return beverages;
    return beverages.filter((b) => config.groups.includes(b.group));
  }, [beverages, config.groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      <EmbedMapContainer
        beverages={filteredBeverages}
        allBeverages={beverages}
        config={config}
        className="absolute inset-0"
      />

      {/* Powered by attribution */}
      <div className="absolute bottom-1 left-1 z-[1000] pointer-events-auto">
        <a
          href={typeof window !== 'undefined' ? window.location.origin : '/'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200/50 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Alcohol Origins Map
        </a>
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400 mx-auto mb-3"></div>
            <p className="text-gray-500 text-sm">Loading map...</p>
          </div>
        </div>
      }
    >
      <EmbedMapContent />
    </Suspense>
  );
}
