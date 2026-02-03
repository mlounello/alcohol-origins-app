'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Beverage } from '@/types/database';
import { MapContainer } from '@/components/map/MapContainer';
import { FilterPanel, FilterState } from '@/components/map/FilterPanel';
import { TimelineSlider } from '@/components/map/TimelineSlider';

export default function MapPage() {
  const router = useRouter();
  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    groups: [],
    types: [],
    yearRange: [null, null],
    country: '',
  });

  const [timelineYear, setTimelineYear] = useState<number>(2024);
  const [showTimeline, setShowTimeline] = useState(false);

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

  // Fetch countries for filter dropdown
  useEffect(() => {
    async function fetchCountries() {
      try {
        const response = await fetch('/api/beverages/countries');
        if (response.ok) {
          const data = await response.json();
          setCountries(data);
        }
      } catch (err) {
        console.error('Error fetching countries:', err);
      }
    }

    fetchCountries();
  }, []);

  // Calculate year range from data
  const yearBounds = useMemo(() => {
    const yearsWithData = beverages
      .map((b) => b.date_year)
      .filter((y): y is number => y !== null);

    if (yearsWithData.length === 0) {
      return { min: -10000, max: 2024 };
    }

    return {
      min: Math.min(...yearsWithData),
      max: Math.max(...yearsWithData),
    };
  }, [beverages]);

  // Filter beverages based on current filters and timeline
  const filteredBeverages = useMemo(() => {
    let result = [...beverages];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(searchLower) ||
          b.type.toLowerCase().includes(searchLower) ||
          b.description?.toLowerCase().includes(searchLower) ||
          b.origin_region?.toLowerCase().includes(searchLower) ||
          b.origin_country?.toLowerCase().includes(searchLower)
      );
    }

    // Apply group filter
    if (filters.groups.length > 0) {
      result = result.filter((b) => filters.groups.includes(b.group));
    }

    // Apply type filter
    if (filters.types.length > 0) {
      result = result.filter((b) => filters.types.includes(b.type));
    }

    // Apply country filter
    if (filters.country) {
      result = result.filter((b) => b.origin_country === filters.country);
    }

    // Apply year range filter from FilterPanel
    if (filters.yearRange[0] !== null) {
      result = result.filter(
        (b) => b.date_year === null || b.date_year >= filters.yearRange[0]!
      );
    }
    if (filters.yearRange[1] !== null) {
      result = result.filter(
        (b) => b.date_year === null || b.date_year <= filters.yearRange[1]!
      );
    }

    // Apply timeline filter if active
    if (showTimeline) {
      result = result.filter(
        (b) => b.date_year === null || b.date_year <= timelineYear
      );
    }

    return result;
  }, [beverages, filters, showTimeline, timelineYear]);

  const handleBeverageClick = (beverage: Beverage) => {
    router.push(`/beverages/${beverage.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Filter bar */}
      <div className="p-4 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between gap-4 max-w-screen-2xl mx-auto">
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            countries={countries}
          />

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showTimeline}
                onChange={(e) => setShowTimeline(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show Timeline
            </label>

            <div className="text-sm text-muted-foreground">
              {filteredBeverages.length} of {beverages.length} beverages
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          beverages={filteredBeverages}
          allBeverages={beverages}
          onBeverageClick={handleBeverageClick}
          className="absolute inset-0"
        />

        {/* Timeline slider overlay */}
        {showTimeline && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <TimelineSlider
              minYear={yearBounds.min}
              maxYear={yearBounds.max}
              currentYear={timelineYear}
              onYearChange={setTimelineYear}
            />
          </div>
        )}
      </div>
    </div>
  );
}
