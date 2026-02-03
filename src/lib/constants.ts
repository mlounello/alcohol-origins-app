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

// Tile layers
export const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: 'Street',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    name: 'Satellite',
  },
  hybrid: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: 'Hybrid',
  },
};

// Role permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  viewer: ['read'],
  contributor: ['read', 'create', 'edit'],
  editor: ['read', 'create', 'edit', 'revert', 'lock'],
  admin: ['read', 'create', 'edit', 'revert', 'lock', 'delete', 'manage_users', 'import'],
};

// Check if a role can perform an action
export function canPerformAction(role: UserRole, action: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
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
