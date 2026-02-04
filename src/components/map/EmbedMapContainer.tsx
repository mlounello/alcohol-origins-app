'use client';

import dynamic from 'next/dynamic';
import { Beverage } from '@/types/database';
import { EmbedMapConfig } from './EmbedMapInner';

// Dynamically import to avoid SSR issues with Leaflet
const EmbedMapWithNoSSR = dynamic(() => import('./EmbedMapInner'), {
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

interface EmbedMapContainerProps {
  beverages: Beverage[];
  allBeverages?: Beverage[];
  config: EmbedMapConfig;
  className?: string;
}

export function EmbedMapContainer({
  beverages,
  allBeverages,
  config,
  className = '',
}: EmbedMapContainerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <EmbedMapWithNoSSR
        beverages={beverages}
        allBeverages={allBeverages || beverages}
        config={config}
      />
    </div>
  );
}
