'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap, LayersControl } from 'react-leaflet';
import { Beverage } from '@/types/database';
import { MAP_CONFIG, TILE_LAYERS } from '@/lib/constants';
import { useSettings } from '@/providers/SettingsProvider';
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
  onEditClick?: (beverage: Beverage) => void;
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
  onEditClick,
}: MapInnerProps) {
  const { settings } = useSettings();

  // Map style name to checked status
  const styleNames: Record<string, string> = {
    street: 'Street (English)',
    light: 'Light',
    satellite: 'Satellite',
    dark: 'Dark',
  };

  const defaultStyleName = styleNames[settings.defaultMapStyle] || 'Street (English)';

  return (
    <MapContainer
      center={[settings.defaultCenter.lat, settings.defaultCenter.lng]}
      zoom={settings.defaultZoom}
      minZoom={MAP_CONFIG.minZoom}
      maxZoom={MAP_CONFIG.maxZoom}
      className="w-full h-full z-0"
      style={{ background: '#1a1a2e' }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked={defaultStyleName === 'Street (English)'} name="Street (English)">
          <TileLayer
            attribution={TILE_LAYERS.street.attribution}
            url={TILE_LAYERS.street.url}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked={defaultStyleName === 'Light'} name="Light">
          <TileLayer
            attribution={TILE_LAYERS.light.attribution}
            url={TILE_LAYERS.light.url}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked={defaultStyleName === 'Satellite'} name="Satellite">
          <TileLayer
            attribution={TILE_LAYERS.satellite.attribution}
            url={TILE_LAYERS.satellite.url}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked={defaultStyleName === 'Dark'} name="Dark">
          <TileLayer
            attribution={TILE_LAYERS.dark.attribution}
            url={TILE_LAYERS.dark.url}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MapController beverages={beverages} />

      {/* Family tree lines connecting parent-child relationships */}
      {settings.showFamilyTreeLines && (
        <FamilyTreeLines beverages={beverages} allBeverages={allBeverages} />
      )}

      {/* Beverage markers */}
      {beverages.map((beverage) => (
        <BeverageMarker
          key={beverage.id}
          beverage={beverage}
          onEditClick={onEditClick}
        />
      ))}

      {/* Legend */}
      {settings.showLegend && <MapLegend />}
    </MapContainer>
  );
}
