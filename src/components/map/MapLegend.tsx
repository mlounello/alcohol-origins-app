'use client';

import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GROUP_COLORS, BEVERAGE_GROUPS } from '@/lib/constants';

export function MapLegend() {
  const map = useMap();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Create custom Leaflet control for the legend
    const LegendControl = L.Control.extend({
      options: {
        position: 'bottomright',
      },

      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-legend');
        container.id = 'map-legend-container';

        // Prevent map interactions when clicking on legend
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },
    });

    const legend = new LegendControl();
    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map]);

  // Render legend content into the container via portal-like pattern
  useEffect(() => {
    const container = document.getElementById('map-legend-container');
    if (!container) return;

    // Build legend HTML
    const legendHTML = `
      <div class="bg-white rounded-lg shadow-lg overflow-hidden min-w-[140px]">
        <button
          id="legend-toggle"
          class="w-full px-3 py-2 text-left font-semibold text-sm bg-gray-100 hover:bg-gray-200 flex justify-between items-center"
        >
          <span>Legend</span>
          <span class="text-gray-500">${isCollapsed ? '▲' : '▼'}</span>
        </button>
        ${
          !isCollapsed
            ? `
        <div class="p-3 space-y-2">
          <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Beverage Groups
          </div>
          ${BEVERAGE_GROUPS.map(
            (group) => `
            <div class="flex items-center gap-2">
              <span
                class="w-4 h-4 rounded-full flex-shrink-0"
                style="background-color: ${GROUP_COLORS[group]}; ${
              GROUP_COLORS[group] === '#FFFFFF' ? 'border: 1px solid #666;' : ''
            }"
              ></span>
              <span class="text-sm">${group}</span>
            </div>
          `
          ).join('')}

          <div class="border-t pt-2 mt-2">
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Marker Size
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                <span class="text-xs text-gray-600">Recent</span>
              </div>
              <span class="text-gray-400">→</span>
              <div class="flex items-center gap-1">
                <span class="w-4 h-4 rounded-full bg-gray-400"></span>
                <span class="text-xs text-gray-600">Ancient</span>
              </div>
            </div>
          </div>

          <div class="border-t pt-2 mt-2">
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Connections
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center">
                <div class="w-4 border-t-2 border-gray-400"></div>
                <div style="width: 0; height: 0; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 6px solid #9ca3af; margin-left: -1px;"></div>
              </div>
              <span class="text-xs text-gray-600">Parent → Child</span>
            </div>
          </div>
        </div>
        `
            : ''
        }
      </div>
    `;

    container.innerHTML = legendHTML;

    // Add click handler for toggle
    const toggleBtn = document.getElementById('legend-toggle');
    if (toggleBtn) {
      toggleBtn.onclick = () => setIsCollapsed(!isCollapsed);
    }
  }, [isCollapsed]);

  return null;
}
