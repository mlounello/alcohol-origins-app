'use client';

import { useMemo, useEffect } from 'react';
import { Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-polylinedecorator';
import { Beverage } from '@/types/database';
import { GROUP_COLORS } from '@/lib/constants';

interface FamilyTreeLinesProps {
  beverages: Beverage[];
  allBeverages: Beverage[];
}

interface LineData {
  parent: Beverage;
  child: Beverage;
  color: string;
}

interface PolylineDecoratorApi {
  polylineDecorator: (
    polyline: L.Polyline,
    options: {
      patterns: Array<{
        offset: string;
        repeat: number;
        symbol: unknown;
      }>;
    }
  ) => L.Layer;
  Symbol: {
    arrowHead: (options: {
      pixelSize: number;
      polygon: boolean;
      pathOptions: L.PathOptions;
    }) => unknown;
  };
}

// Component to add arrow decorators to a polyline
function ArrowDecorator({
  positions,
  color
}: {
  positions: [number, number][];
  color: string;
}) {
  const map = useMap();

  useEffect(() => {
    const polyline = L.polyline(positions);

    const decoratorApi = L as unknown as PolylineDecoratorApi;
    const decorator = decoratorApi.polylineDecorator(polyline, {
      patterns: [
        {
          offset: '50%',
          repeat: 0,
          symbol: decoratorApi.Symbol.arrowHead({
            pixelSize: 12,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: color,
              weight: 2,
              opacity: 0.8,
            },
          }),
        },
      ],
    }).addTo(map);

    return () => {
      map.removeLayer(decorator);
    };
  }, [map, positions, color]);

  return null;
}

export function FamilyTreeLines({ beverages, allBeverages }: FamilyTreeLinesProps) {
  const lines = useMemo(() => {
    const result: LineData[] = [];

    // Create a map of all beverages by node_id for quick lookup (parent_id references node_id)
    const beverageByNodeId = new Map<string, Beverage>();
    allBeverages.forEach((b) => beverageByNodeId.set(b.node_id, b));

    // Find parent-child relationships for visible beverages
    beverages.forEach((child) => {
      if (child.parent_id) {
        const parent = beverageByNodeId.get(child.parent_id);
        if (parent) {
          // Use child's group color for the line
          const color = GROUP_COLORS[child.group] || GROUP_COLORS.Other;
          result.push({ parent, child, color });
        }
      }
    });

    return result;
  }, [beverages, allBeverages]);

  if (lines.length === 0) return null;

  return (
    <>
      {lines.map(({ parent, child, color }) => {
        const positions: [number, number][] = [
          [parent.latitude, parent.longitude],
          [child.latitude, child.longitude],
        ];

        // Calculate midpoint for tooltip
        const midLat = (parent.latitude + child.latitude) / 2;
        const midLng = (parent.longitude + child.longitude) / 2;

        return (
          <div key={`${parent.id}-${child.id}`}>
            <Polyline
              positions={positions}
              pathOptions={{
                color: color,
                weight: 2,
                opacity: 0.7,
              }}
            >
              <Tooltip
                position={[midLat, midLng]}
                direction="center"
                permanent={false}
              >
                <div className="text-xs">
                  <p className="font-medium">{parent.name}</p>
                  <p className="text-gray-500">↓ gave rise to</p>
                  <p className="font-medium">{child.name}</p>
                </div>
              </Tooltip>
            </Polyline>
            <ArrowDecorator positions={positions} color={color} />
          </div>
        );
      })}
    </>
  );
}
