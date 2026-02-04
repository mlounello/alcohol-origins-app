'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useSettings, AppSettings, DEFAULT_SETTINGS } from '@/providers/SettingsProvider';
import { BEVERAGE_GROUPS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Map,
  Globe,
  Database,
  Code,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Embed settings state
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('600px');
  const [embedStyle, setEmbedStyle] = useState<string>('street');
  const [embedZoom, setEmbedZoom] = useState(2);
  const [embedLat, setEmbedLat] = useState(30);
  const [embedLng, setEmbedLng] = useState(0);
  const [embedLegend, setEmbedLegend] = useState(true);
  const [embedFamilyTree, setEmbedFamilyTree] = useState(true);
  const [embedGroups, setEmbedGroups] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });
    setHasChanges(true);
    setStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    try {
      // Settings are already saved via the provider
      await new Promise(resolve => setTimeout(resolve, 300));

      setStatus({ type: 'success', message: 'Settings saved successfully! Refresh the map page to see changes.' });
      setHasChanges(false);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    resetSettings();
    setHasChanges(true);
    setStatus(null);
  };

  // Generate the embed URL
  const embedUrl = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const params = new URLSearchParams();

    if (embedStyle !== 'street') params.set('style', embedStyle);
    if (embedZoom !== 2) params.set('zoom', embedZoom.toString());
    if (embedLat !== 30) params.set('lat', embedLat.toString());
    if (embedLng !== 0) params.set('lng', embedLng.toString());
    if (!embedLegend) params.set('legend', 'false');
    if (!embedFamilyTree) params.set('familytree', 'false');
    if (embedGroups.length > 0) params.set('groups', embedGroups.join(','));

    const queryString = params.toString();
    return `${baseUrl}/embed${queryString ? `?${queryString}` : ''}`;
  }, [embedStyle, embedZoom, embedLat, embedLng, embedLegend, embedFamilyTree, embedGroups]);

  // Generate embed code
  const embedCode = useMemo(() => {
    return `<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  style="border: none; border-radius: 8px;"
  loading="lazy"
  title="Alcohol Origins Map"
  allow="fullscreen"
></iframe>`;
  }, [embedUrl, embedWidth, embedHeight]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = embedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleGroup = (group: string) => {
    setEmbedGroups((prev) =>
      prev.includes(group)
        ? prev.filter((g) => g !== group)
        : [...prev, group]
    );
  };

  if (!isAdmin) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can access settings.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Application Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure how your application behaves
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {status && (
        <Alert variant={status.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          {status.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="map" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Map
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Embed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Map Settings</CardTitle>
              <CardDescription>
                Configure the default map appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mapStyle">Default Map Style</Label>
                  <Select
                    value={settings.defaultMapStyle}
                    onValueChange={(value) => updateSetting('defaultMapStyle', value as AppSettings['defaultMapStyle'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street (English)</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="satellite">Satellite</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultZoom">Default Zoom Level</Label>
                  <Input
                    id="defaultZoom"
                    type="number"
                    min={1}
                    max={18}
                    value={settings.defaultZoom}
                    onChange={(e) => updateSetting('defaultZoom', parseInt(e.target.value) || 2)}
                  />
                  <p className="text-xs text-muted-foreground">1 (world) to 18 (street level)</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="centerLat">Default Center Latitude</Label>
                  <Input
                    id="centerLat"
                    type="number"
                    step="any"
                    value={settings.defaultCenter.lat}
                    onChange={(e) => updateSetting('defaultCenter', {
                      ...settings.defaultCenter,
                      lat: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="centerLng">Default Center Longitude</Label>
                  <Input
                    id="centerLng"
                    type="number"
                    step="any"
                    value={settings.defaultCenter.lng}
                    onChange={(e) => updateSetting('defaultCenter', {
                      ...settings.defaultCenter,
                      lng: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showFamilyTreeLines">Show Family Tree Lines</Label>
                    <p className="text-sm text-muted-foreground">
                      Display connecting lines between parent and child beverages
                    </p>
                  </div>
                  <Switch
                    id="showFamilyTreeLines"
                    checked={settings.showFamilyTreeLines}
                    onCheckedChange={(checked) => updateSetting('showFamilyTreeLines', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showLegend">Show Legend</Label>
                    <p className="text-sm text-muted-foreground">
                      Display the color legend on the map
                    </p>
                  </div>
                  <Switch
                    id="showLegend"
                    checked={settings.showLegend}
                    onCheckedChange={(checked) => updateSetting('showLegend', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic application information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => updateSetting('siteName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => updateSetting('siteDescription', e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Used for SEO and social sharing
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowPublicViewing">Allow Public Viewing</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to view the map without logging in
                    </p>
                  </div>
                  <Switch
                    id="allowPublicViewing"
                    checked={settings.allowPublicViewing}
                    onCheckedChange={(checked) => updateSetting('allowPublicViewing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requireLoginToView">Require Login to View Details</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must log in to see beverage details
                    </p>
                  </div>
                  <Switch
                    id="requireLoginToView"
                    checked={settings.requireLoginToView}
                    onCheckedChange={(checked) => updateSetting('requireLoginToView', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Settings</CardTitle>
              <CardDescription>
                Configure data backup and management options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoBackupEnabled">Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup data at regular intervals
                  </p>
                </div>
                <Switch
                  id="autoBackupEnabled"
                  checked={settings.autoBackupEnabled}
                  onCheckedChange={(checked) => updateSetting('autoBackupEnabled', checked)}
                />
              </div>

              {settings.autoBackupEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Backup Frequency (days)</Label>
                  <Input
                    id="backupFrequency"
                    type="number"
                    min={1}
                    max={30}
                    value={settings.backupFrequencyDays}
                    onChange={(e) => updateSetting('backupFrequencyDays', parseInt(e.target.value) || 7)}
                  />
                </div>
              )}

              <div className="pt-4 border-t space-y-4">
                <h4 className="font-medium">Manual Actions</h4>

                <div className="flex gap-4">
                  <Button variant="outline" disabled>
                    <Database className="h-4 w-4 mr-2" />
                    Export All Data (CSV)
                  </Button>
                  <Button variant="outline" disabled>
                    <Database className="h-4 w-4 mr-2" />
                    Export All Data (JSON)
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    For full database backup and restore, use the Supabase Dashboard directly.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Embed Settings Tab */}
        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Embed Map</CardTitle>
              <CardDescription>
                Generate HTML code to embed a view-only version of the map on external websites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dimensions */}
              <div>
                <h4 className="font-medium mb-3">Dimensions</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="embedWidth">Width</Label>
                    <Input
                      id="embedWidth"
                      value={embedWidth}
                      onChange={(e) => setEmbedWidth(e.target.value)}
                      placeholder="100% or 800px"
                    />
                    <p className="text-xs text-muted-foreground">Use % for responsive or px for fixed width</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="embedHeight">Height</Label>
                    <Input
                      id="embedHeight"
                      value={embedHeight}
                      onChange={(e) => setEmbedHeight(e.target.value)}
                      placeholder="600px"
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 400px - 800px</p>
                  </div>
                </div>
              </div>

              {/* Map Style */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Map Appearance</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="embedStyle">Map Style</Label>
                    <Select value={embedStyle} onValueChange={setEmbedStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="street">Street (English)</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="satellite">Satellite</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="embedZoom">Default Zoom</Label>
                    <Input
                      id="embedZoom"
                      type="number"
                      min={1}
                      max={18}
                      value={embedZoom}
                      onChange={(e) => setEmbedZoom(parseInt(e.target.value) || 2)}
                    />
                    <p className="text-xs text-muted-foreground">1 (world) to 18 (street)</p>
                  </div>
                </div>
              </div>

              {/* Center Position */}
              <div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="embedLat">Center Latitude</Label>
                    <Input
                      id="embedLat"
                      type="number"
                      step="any"
                      value={embedLat}
                      onChange={(e) => setEmbedLat(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="embedLng">Center Longitude</Label>
                    <Input
                      id="embedLng"
                      type="number"
                      step="any"
                      value={embedLng}
                      onChange={(e) => setEmbedLng(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Toggle options */}
              <div className="pt-4 border-t space-y-4">
                <h4 className="font-medium">Display Options</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="embedLegend">Show Legend</Label>
                    <p className="text-sm text-muted-foreground">
                      Display the color legend overlay
                    </p>
                  </div>
                  <Switch
                    id="embedLegend"
                    checked={embedLegend}
                    onCheckedChange={setEmbedLegend}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="embedFamilyTree">Show Family Tree Lines</Label>
                    <p className="text-sm text-muted-foreground">
                      Display connecting lines between related beverages
                    </p>
                  </div>
                  <Switch
                    id="embedFamilyTree"
                    checked={embedFamilyTree}
                    onCheckedChange={setEmbedFamilyTree}
                  />
                </div>
              </div>

              {/* Group Filter */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Filter by Group</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Leave all unchecked to show all groups, or select specific groups to display
                </p>
                <div className="flex flex-wrap gap-2">
                  {BEVERAGE_GROUPS.map((group) => (
                    <button
                      key={group}
                      onClick={() => toggleGroup(group)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        embedGroups.includes(group)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Generated Embed Code</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Paste this HTML code into your website to embed the map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>{embedCode}</code>
                </pre>
              </div>

              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The embedded map is read-only and does not require authentication. Make sure your
                  application&apos;s API is accessible from the domain where you embed the map. You may
                  need to configure CORS settings if embedding on a different domain.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                This is how the embedded map will appear on your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border rounded-lg overflow-hidden"
                style={{ width: '100%', height: '400px' }}
              >
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  loading="lazy"
                  title="Embed Preview"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
