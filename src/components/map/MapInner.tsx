'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Beverage } from '@/types/database';
import { MAP_CONFIG, TILE_LAYERS, GROUP_COLORS } from '@/lib/constants';
import { BeverageMarker } from './BeverageMarker';
import { FamilyTreeLines } from './FamilyTreeLines';
import { MapLegend } from './MapLegend';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapInnerProps {
  beverages: Beverage[];
  allBeverages: Beverage[];
  onBeverageClick?: (beverage: Beverage) => void;
}

function MapController({ beverages }: { beverages: Beverage[] }) {
  const map = useMap();

  useEffect(() => {
    if (beverages.length === 0) return;

    // Fit bounds to show all markers
    const bounds = L.latLngBounds(
      beverages.map((b) => [b.latitude, b.longitude] as [number, number])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, []);

  return null;
}

export default function MapInner({
  beverages,
  allBeverages,
  onBeverageClick,
}: MapInnerProps) {
  return (
    <MapContainer
      center={MAP_CONFIG.defaultCenter}
      zoom={MAP_CONFIG.defaultZoom}
      minZoom={MAP_CONFIG.minZoom}
      maxZoom={MAP_CONFIG.maxZoom}
      className="w-full h-full z-0"
      style={{ background: '#1a1a2e' }}
    >
      <TileLayer
        attribution={TILE_LAYERS.street.attribution}
        url={TILE_LAYERS.street.url}
      />

      <MapController beverages={beverages} />

      {/* Family tree lines connecting parent-child relationships */}
      <FamilyTreeLines beverages={beverages} allBeverages={allBeverages} />

      {/* Beverage markers */}
      {beverages.map((beverage) => (
        <BeverageMarker
          key={beverage.id}
          beverage={beverage}
          onClick={onBeverageClick}
        />
      ))}

      {/* Legend */}
      <MapLegend />
    </MapContainer>
  );
}
