'use client';

import dynamic from 'next/dynamic';
import { Beverage } from '@/types/database';

// Dynamically import Leaflet components to avoid SSR issues
const MapWithNoSSR = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

interface MapContainerProps {
  beverages: Beverage[];
  allBeverages?: Beverage[];
  onEditClick?: (beverage: Beverage) => void;
  className?: string;
}

export function MapContainer({
  beverages,
  allBeverages,
  onEditClick,
  className = '',
}: MapContainerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <MapWithNoSSR
        beverages={beverages}
        allBeverages={allBeverages || beverages}
        onEditClick={onEditClick}
      />
    </div>
  );
}
