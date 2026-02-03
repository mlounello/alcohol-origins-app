/**
 * Geographic utilities for map operations
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Validate coordinates are within valid ranges
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculate distance between two points in kilometers (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bounds for an array of coordinates
 */
export function calculateBounds(
  coordinates: Coordinates[]
): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const coord of coordinates) {
    if (coord.latitude < minLat) minLat = coord.latitude;
    if (coord.latitude > maxLat) maxLat = coord.latitude;
    if (coord.longitude < minLng) minLng = coord.longitude;
    if (coord.longitude > maxLng) maxLng = coord.longitude;
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * Get center point of bounds
 */
export function getBoundsCenter(
  bounds: [[number, number], [number, number]]
): [number, number] {
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
}
