/**
 * Date parsing utilities ported from create_map.py
 * Handles historical dates including BCE/CE and century notation
 */

/**
 * Convert a date like '3500 BCE', '16th century CE', or '1840 CE' into
 * an approximate numeric year: BCE → negative, CE → positive, century → midpoint.
 * If parsing fails, returns 0.
 */
export function parseYear(dateStr: string): number {
  const trimmed = dateStr.trim();

  // Match "3500 BCE" or "1840 CE"
  const eraMatch = trimmed.match(/^(\d+)\s*(BCE|CE)$/i);
  if (eraMatch) {
    const year = parseInt(eraMatch[1], 10);
    const era = eraMatch[2].toUpperCase();
    return era === 'BCE' ? -year : year;
  }

  // Match "16th century CE" or "3rd century BCE"
  const centuryMatch = trimmed.match(/^(\d+)(?:st|nd|rd|th)\s+century\s*(BCE|CE)$/i);
  if (centuryMatch) {
    const century = parseInt(centuryMatch[1], 10);
    const era = centuryMatch[2].toUpperCase();
    const mid = century * 100 - 50; // Midpoint of the century
    return era === 'BCE' ? -mid : mid;
  }

  // Match plain year "1840"
  const yearMatch = trimmed.match(/^(\d{3,4})$/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }

  return 0;
}

/**
 * Map year range -5000→2000 into radius 12→4, clamped to 4–12.
 * Older events get larger circles for visual prominence.
 */
export function computeRadius(year: number): number {
  if (year === 0) {
    return 5; // Default for unknown dates
  }

  // Linear interpolation: -5000 → 12, 2000 → 4
  const m = (4 - 12) / (2000 - (-5000)); // slope
  const b = 12 - m * -5000; // y-intercept
  const r = m * year + b;

  return Math.max(4, Math.min(12, Math.round(r)));
}

/**
 * Format a numeric year for display (handles BCE/CE)
 */
export function formatYear(year: number | null): string {
  if (year === null || year === 0) {
    return 'Unknown';
  }

  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }

  return `${year} CE`;
}

/**
 * Format a date string for display, keeping original format if valid
 */
export function formatDateText(dateText: string, year: number | null): string {
  if (dateText && dateText.trim()) {
    return dateText.trim();
  }
  return formatYear(year);
}

/**
 * Get century from year
 */
export function getCentury(year: number): number {
  if (year === 0) return 0;
  return Math.ceil(Math.abs(year) / 100) * (year < 0 ? -1 : 1);
}

/**
 * Format century for display
 */
export function formatCentury(century: number): string {
  if (century === 0) return 'Unknown';

  const abs = Math.abs(century);
  const suffix = getSuffix(abs);
  const era = century < 0 ? 'BCE' : 'CE';

  return `${abs}${suffix} century ${era}`;
}

function getSuffix(n: number): string {
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }

  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
