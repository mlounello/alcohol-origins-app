'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap, LayersControl } from 'react-leaflet';
import { Beverage } from '@/types/database';
import { MAP_CONFIG, TILE_LAYERS } from '@/lib/constants';
import { EmbedBeverageMarker } from './EmbedBeverageMarker';
import { FamilyTreeLines } from './FamilyTreeLines';
import { MapLegend } from './MapLegend';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface EmbedMapConfig {
  mapStyle: 'street' | 'light' | 'satellite' | 'dark';
  zoom: number;
  center: { lat: number; lng: number };
  showFamilyTreeLines: boolean;
  showLegend: boolean;
  groups: string[];
}

interface EmbedMapInnerProps {
  beverages: Beverage[];
  allBeverages: Beverage[];
  config: EmbedMapConfig;
}

function MapController({ beverages, config }: { beverages: Beverage[]; config: EmbedMapConfig }) {
  const map = useMap();

  useEffect(() => {
    // Only fit bounds if no specific center/zoom was set (default values)
    if (config.center.lat === 30 && config.center.lng === 0 && config.zoom === 2) {
      if (beverages.length === 0) return;
      const bounds = L.latLngBounds(
        beverages.map((b) => [b.latitude, b.longitude] as [number, number])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      }
    }
  }, []);

  return null;
}

export default function EmbedMapInner({
  beverages,
  allBeverages,
  config,
}: EmbedMapInnerProps) {
  const styleNames: Record<string, string> = {
    street: 'Street (English)',
    light: 'Light',
    satellite: 'Satellite',
    dark: 'Dark',
  };

  const defaultStyleName = styleNames[config.mapStyle] || 'Street (English)';

  return (
    <MapContainer
      center={[config.center.lat, config.center.lng]}
      zoom={config.zoom}
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

      <MapController beverages={beverages} config={config} />

      {/* Family tree lines connecting parent-child relationships */}
      {config.showFamilyTreeLines && (
        <FamilyTreeLines beverages={beverages} allBeverages={allBeverages} />
      )}

      {/* Beverage markers (view-only, no edit button) */}
      {beverages.map((beverage) => (
        <EmbedBeverageMarker
          key={beverage.id}
          beverage={beverage}
        />
      ))}

      {/* Legend */}
      {config.showLegend && <MapLegend />}
    </MapContainer>
  );
}
