'use client';

import { CircleMarker, Popup } from 'react-leaflet';
import { Beverage } from '@/types/database';
import { GROUP_COLORS, getContrastTextColor } from '@/lib/constants';
import { computeRadius, formatDateText } from '@/lib/utils/dates';

interface EmbedBeverageMarkerProps {
  beverage: Beverage;
}

export function EmbedBeverageMarker({ beverage }: EmbedBeverageMarkerProps) {
  const color = GROUP_COLORS[beverage.group] || GROUP_COLORS.Other;
  const radius = computeRadius(beverage.date_year || 0);
  const textColor = getContrastTextColor(color);

  const fillColor = color;
  const strokeColor = color === '#FFFFFF' ? '#666666' : color;

  return (
    <CircleMarker
      center={[beverage.latitude, beverage.longitude]}
      radius={radius}
      pathOptions={{
        color: strokeColor,
        fillColor: fillColor,
        fillOpacity: 0.7,
        weight: 2,
      }}
    >
      <Popup>
        <div className="min-w-[200px] max-w-[300px]">
          <h3 className="font-bold text-lg mb-1">{beverage.name}</h3>

          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Type:</span> {beverage.type}
            </p>
            <p className="flex items-center gap-1">
              <span className="font-medium">Group:</span>{' '}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: color,
                  color: textColor,
                  border: color === '#FFFFFF' ? '1px solid #ccc' : 'none',
                }}
              >
                {beverage.group}
              </span>
            </p>
            <p>
              <span className="font-medium">Origin:</span>{' '}
              {beverage.origin_region || 'Unknown'}
              {beverage.origin_country && `, ${beverage.origin_country}`}
            </p>
            <p>
              <span className="font-medium">Date:</span>{' '}
              {formatDateText(beverage.date_text, beverage.date_year)}
            </p>
          </div>

          {beverage.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-3">
              {beverage.description}
            </p>
          )}

          {beverage.citation && (
            <p className="mt-2 text-xs text-gray-400 italic">
              Source: {beverage.citation}
            </p>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}
