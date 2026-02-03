'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportRow {
  node_id: string;
  type: string;
  group: string;
  date: string;
  latitude: string;
  longitude: string;
  parent_id?: string;
  description?: string;
  citation?: string;
  origin_region?: string;
  origin_country?: string;
}

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

  // Match "16th century CE"
  const m2 = str.match(/^(\d+)(?:st|nd|rd|th)\s+century\s*(BCE|CE)$/i);
  if (m2) {
    const century = parseInt(m2[1], 10);
    const era = m2[2].toUpperCase();
    const mid = century * 100 - 50;
    return era === 'BCE' ? -mid : mid;
  }

  // Match plain year
  const m3 = str.match(/^(\d{3,4})$/);
  if (m3) return parseInt(m3[1], 10);

  // Match approximate "~3000 BCE"
  const m4 = str.match(/^~?\s*(\d+)\s*(BCE|CE)$/i);
  if (m4) {
    const year = parseInt(m4[1], 10);
    const era = m4[2].toUpperCase();
    return era === 'BCE' ? -year : year;
  }

  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
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

function parseCSV(csvText: string): ImportRow[] {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    if (row.latitude && row.longitude && row.node_id) {
      rows.push(row as unknown as ImportRow);
    }
  }

  return rows;
}

function mapGroup(group: string): string {
  const normalized = group.trim().toLowerCase();
  const validGroups = ['Grain', 'Grape', 'Sugar', 'Cactus', 'Other'];
  for (const g of validGroups) {
    if (g.toLowerCase() === normalized) return g;
  }
  return 'Other';
}

export default function ImportPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [progress, setProgress] = useState('');

  const isAdmin = profile?.role === 'admin';

  const handleImport = async () => {
    if (!csvData.trim()) {
      setStatus({ type: 'error', message: 'Please paste CSV data first' });
      return;
    }

    setImporting(true);
    setStatus(null);
    setProgress('Parsing CSV data...');

    try {
      const rows = parseCSV(csvData);
      if (rows.length === 0) {
        throw new Error('No valid rows found in CSV');
      }

      setProgress(`Found ${rows.length} rows. Clearing existing data...`);

      // Clear existing data
      const clearResponse = await fetch('/api/admin/import', {
        method: 'DELETE',
      });

      if (!clearResponse.ok) {
        console.warn('Warning: Could not clear existing data');
      }

      setProgress(`Inserting ${rows.length} beverages...`);

      // Prepare beverages without parent_id first
      const beverages = rows.map(row => ({
        node_id: row.node_id.trim(),
        name: row.node_id.trim(),
        type: row.type?.trim() || 'Unknown',
        group: mapGroup(row.group),
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        origin_region: row.origin_region?.trim() || null,
        origin_country: row.origin_country?.trim() || null,
        date_text: row.date?.trim() || '',
        date_year: parseYear(row.date),
        parent_id: null,
        description: row.description?.trim() || null,
        citation: row.citation?.trim() || null,
      }));

      // Insert beverages
      const insertResponse = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beverages }),
      });

      if (!insertResponse.ok) {
        const error = await insertResponse.json();
        throw new Error(error.error || 'Failed to insert beverages');
      }

      const { nodeIdToUuid, count } = await insertResponse.json();

      setProgress(`Inserted ${count} beverages. Updating parent relationships...`);

      // Update parent relationships
      const parentUpdates = rows
        .filter(row => row.parent_id?.trim())
        .map(row => ({
          node_id: row.node_id.trim(),
          parent_node_id: row.parent_id!.trim(),
        }));

      if (parentUpdates.length > 0) {
        const parentResponse = await fetch('/api/admin/import/parents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: parentUpdates, nodeIdToUuid }),
        });

        if (!parentResponse.ok) {
          console.warn('Warning: Some parent relationships may not have been updated');
        }
      }

      setStatus({ type: 'success', message: `Successfully imported ${count} beverages!` });
      setProgress('');

    } catch (error) {
      console.error('Import error:', error);
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Import failed' });
      setProgress('');
    } finally {
      setImporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can import data.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Import Data</h1>

      <Card>
        <CardHeader>
          <CardTitle>Import from CSV</CardTitle>
          <CardDescription>
            Paste CSV data from Google Sheets. Expected columns: node_id, type, group, date,
            latitude, longitude, parent_id, description, citation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV Data</label>
            <Textarea
              placeholder="Paste your CSV data here...&#10;&#10;node_id,type,group,date,latitude,longitude,parent_id,description,citation&#10;Beer,Beer,Grain,3500 BCE,33.3,44.4,,Ancient beer,Source..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          {status && (
            <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
              {status.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          {progress && (
            <p className="text-sm text-muted-foreground">{progress}</p>
          )}

          <div className="flex gap-4">
            <Button onClick={handleImport} disabled={importing || !csvData.trim()}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </>
              )}
            </Button>

            <Button variant="outline" onClick={() => router.push('/map')}>
              View Map
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open your Google Sheet</li>
              <li>Select all data (Cmd+A or Ctrl+A)</li>
              <li>Copy (Cmd+C or Ctrl+C)</li>
              <li>Paste into the text area above</li>
              <li>Click "Import Data"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
