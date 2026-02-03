/**
 * Import data from Google Sheets into Supabase
 *
 * Usage: npx tsx scripts/import-data.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Google Sheet ID from the original project
const SHEET_ID = '1obKjWhdnJhK3f6qImN0DrQJEBZP-YigvjrU128QkjMM';
const WORKSHEET_NAME = 'Data';

// CSV export URL format for Google Sheets
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${WORKSHEET_NAME}`;

interface SheetRow {
  node_id: string;
  type: string;
  group: string;
  date: string;
  latitude: string;
  longitude: string;
  parent_id: string;
  description: string;
  citation: string;
  origin_region?: string;
  origin_country?: string;
}

interface BeverageInsert {
  node_id: string;
  name: string;
  type: string;
  group: string;
  latitude: number;
  longitude: number;
  origin_region: string | null;
  origin_country: string | null;
  date_text: string;
  date_year: number | null;
  parent_id: string | null;
  description: string | null;
  citation: string | null;
}

/**
 * Parse date string like '3500 BCE', '16th century CE', or '1840 CE' into a numeric year
 */
function parseYear(dateStr: string): number | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const str = dateStr.trim();

  // Match "3500 BCE" or "1840 CE"
  const m1 = str.match(/^(\d+)\s*(BCE|CE)$/i);
  if (m1) {
    const year = parseInt(m1[1], 10);
    const era = m1[2].toUpperCase();
    return era === 'BCE' ? -year : year;
  }

  // Match "16th century CE" or "3rd century BCE"
  const m2 = str.match(/^(\d+)(?:st|nd|rd|th)\s+century\s*(BCE|CE)$/i);
  if (m2) {
    const century = parseInt(m2[1], 10);
    const era = m2[2].toUpperCase();
    const mid = century * 100 - 50; // midpoint of century
    return era === 'BCE' ? -mid : mid;
  }

  // Match plain year like "1840"
  const m3 = str.match(/^(\d{3,4})$/);
  if (m3) {
    return parseInt(m3[1], 10);
  }

  // Match approximate dates like "~3000 BCE"
  const m4 = str.match(/^~?\s*(\d+)\s*(BCE|CE)$/i);
  if (m4) {
    const year = parseInt(m4[1], 10);
    const era = m4[2].toUpperCase();
    return era === 'BCE' ? -year : year;
  }

  return null;
}

/**
 * Convert a node_id like "beer_fertile_crescent_2900_bce" to a friendly display name
 * Returns "Beer (Fertile Crescent, 2900 BCE)"
 */
function nodeIdToDisplayName(nodeId: string): string {
  if (!nodeId) return '';

  // Split by underscore
  const parts = nodeId.split('_');
  if (parts.length === 0) return nodeId;

  // Extract beverage type (first part)
  const beverageType = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);

  // Check if last parts are date (e.g., "2900_bce" or "16th_century_ce")
  let datePart = '';
  let locationParts: string[] = [];

  // Look for BCE/CE at the end
  const lastPart = parts[parts.length - 1].toLowerCase();
  if (lastPart === 'bce' || lastPart === 'ce') {
    // Check for century format
    if (parts.length >= 4 && parts[parts.length - 2].toLowerCase() === 'century') {
      // Format: "16th_century_ce"
      datePart = `${parts[parts.length - 3]} century ${lastPart.toUpperCase()}`;
      locationParts = parts.slice(1, parts.length - 3);
    } else if (parts.length >= 3) {
      // Format: "2900_bce"
      datePart = `${parts[parts.length - 2]} ${lastPart.toUpperCase()}`;
      locationParts = parts.slice(1, parts.length - 2);
    } else {
      locationParts = parts.slice(1);
    }
  } else {
    locationParts = parts.slice(1);
  }

  // Convert location parts to title case
  const location = locationParts
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  // Build the display name
  if (location && datePart) {
    return `${beverageType} (${location}, ${datePart})`;
  } else if (location) {
    return `${beverageType} (${location})`;
  } else if (datePart) {
    return `${beverageType} (${datePart})`;
  }

  return beverageType;
}

/**
 * Parse CSV string into array of objects
 */
function parseCSV(csvText: string): SheetRow[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  // Parse header line
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    // Only include rows with valid coordinates
    if (row.latitude && row.longitude && row.node_id) {
      rows.push(row as unknown as SheetRow);
    }
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Map group name to valid enum value
 */
function mapGroup(group: string): string {
  const normalized = group.trim();
  const validGroups = ['Grain', 'Grape', 'Sugar', 'Cactus', 'Other'];

  for (const g of validGroups) {
    if (g.toLowerCase() === normalized.toLowerCase()) {
      return g;
    }
  }

  return 'Other';
}

async function fetchSheetData(): Promise<SheetRow[]> {
  console.log('📊 Fetching data from Google Sheets...');

  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const rows = parseCSV(csvText);

  console.log(`✅ Fetched ${rows.length} rows from Google Sheets`);
  return rows;
}

async function clearExistingData(): Promise<void> {
  console.log('🗑️  Clearing existing beverage data...');

  // Delete all beverages (revisions will be cascade deleted)
  const response = await fetch(`${SUPABASE_URL}/rest/v1/beverages?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.warn(`⚠️  Warning clearing data: ${error}`);
  } else {
    console.log('✅ Cleared existing data');
  }
}

async function insertBeverages(rows: SheetRow[]): Promise<Map<string, string>> {
  console.log('📥 Inserting beverages...');

  // First pass: insert all beverages without parent_id
  const nodeIdToUuid = new Map<string, string>();

  const beverages: BeverageInsert[] = rows.map(row => ({
    node_id: row.node_id.trim(),
    name: nodeIdToDisplayName(row.node_id.trim()),
    type: row.type?.trim() || 'Unknown',
    group: mapGroup(row.group),
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    origin_region: row.origin_region?.trim() || null,
    origin_country: row.origin_country?.trim() || null,
    date_text: row.date?.trim() || '',
    date_year: parseYear(row.date),
    parent_id: null, // Will update in second pass
    description: row.description?.trim() || null,
    citation: row.citation?.trim() || null,
  }));

  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < beverages.length; i += batchSize) {
    const batch = beverages.slice(i, i + batchSize);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/beverages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error inserting batch ${i / batchSize + 1}: ${error}`);
      continue;
    }

    const inserted = await response.json();

    // Map node_id to UUID
    for (const bev of inserted) {
      nodeIdToUuid.set(bev.node_id, bev.id);
    }

    console.log(`  ✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(beverages.length / batchSize)} (${inserted.length} items)`);
  }

  console.log(`✅ Inserted ${nodeIdToUuid.size} beverages`);
  return nodeIdToUuid;
}

async function updateParentRelationships(rows: SheetRow[], nodeIdToUuid: Map<string, string>): Promise<void> {
  console.log('🔗 Updating parent-child relationships...');

  let updateCount = 0;

  for (const row of rows) {
    if (!row.parent_id || row.parent_id.trim() === '') continue;

    const childUuid = nodeIdToUuid.get(row.node_id.trim());
    const parentUuid = nodeIdToUuid.get(row.parent_id.trim());

    if (!childUuid || !parentUuid) {
      console.warn(`  ⚠️  Could not find UUIDs for ${row.node_id} -> ${row.parent_id}`);
      continue;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/beverages?id=eq.${childUuid}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parent_id: parentUuid }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn(`  ⚠️  Failed to update parent for ${row.node_id}: ${error}`);
    } else {
      updateCount++;
    }
  }

  console.log(`✅ Updated ${updateCount} parent relationships`);
}

async function main() {
  console.log('🚀 Starting data import...\n');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
    process.exit(1);
  }

  try {
    // Fetch data from Google Sheets
    const rows = await fetchSheetData();

    if (rows.length === 0) {
      console.error('❌ No data found in Google Sheet');
      process.exit(1);
    }

    // Clear existing data
    await clearExistingData();

    // Insert beverages
    const nodeIdToUuid = await insertBeverages(rows);

    // Update parent relationships
    await updateParentRelationships(rows, nodeIdToUuid);

    console.log('\n🎉 Import complete!');
    console.log(`   Total beverages imported: ${nodeIdToUuid.size}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

main();
