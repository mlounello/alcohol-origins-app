import { BeverageGroup, UserRole } from '@/types/database';

// Group colors matching the original Python implementation
export const GROUP_COLORS: Record<BeverageGroup, string> = {
  Grain: '#f9d81b',   // Yellow
  Grape: '#75147c',   // Purple
  Sugar: '#FFFFFF',   // White
  Cactus: '#367c21',  // Green
  Other: '#808080',   // Gray
};

// Map configuration
export const MAP_CONFIG = {
  defaultCenter: [30, 0] as [number, number],
  defaultZoom: 2,
  minZoom: 2,
  maxZoom: 18,
};

// Tile layers - using CartoDB Positron for clean English labels
export const TILE_LAYERS = {
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: 'Street (English)',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: 'Light',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    name: 'Satellite',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: 'Dark',
  },
};

// Role permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  viewer: ['read'],
  contributor: ['read', 'create', 'edit'],
  editor: ['read', 'create', 'edit', 'revert', 'lock'],
  moderator: ['read', 'create', 'edit', 'revert', 'lock', 'manage_users'],
  admin: ['read', 'create', 'edit', 'revert', 'lock', 'delete', 'manage_users', 'import', 'manage_settings'],
};

// Check if a role can perform an action
export function canPerformAction(role: UserRole, action: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

// Calculate relative luminance of a hex color
function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((c) => {
    const val = parseInt(c, 16) / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Get the best contrasting text color (black or white) for a given background color
export function getContrastTextColor(bgColor: string): string {
  const luminance = getLuminance(bgColor);
  // Use white text on dark backgrounds, black on light
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Beverage types (expandable)
export const BEVERAGE_TYPES = [
  'Beer',
  'Wine',
  'Spirit',
  'Liqueur',
  'Cider',
  'Mead',
  'Sake',
  'Pulque',
  'Mezcal',
  'Rum',
  'Brandy',
  'Whiskey',
  'Vodka',
  'Gin',
  'Tequila',
  'Baijiu',
  'Soju',
  'Other',
] as const;

export const BEVERAGE_GROUPS: BeverageGroup[] = [
  'Grain',
  'Grape',
  'Sugar',
  'Cactus',
  'Other',
];
