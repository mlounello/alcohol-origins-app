'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
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
  Palette,
  Database,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface AppSettings {
  // Map settings
  defaultMapStyle: 'street' | 'light' | 'satellite' | 'dark';
  defaultZoom: number;
  defaultCenter: { lat: number; lng: number };
  showFamilyTreeLines: boolean;
  showLegend: boolean;

  // General settings
  siteName: string;
  siteDescription: string;
  allowPublicViewing: boolean;
  requireLoginToView: boolean;

  // Data settings
  autoBackupEnabled: boolean;
  backupFrequencyDays: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultMapStyle: 'street',
  defaultZoom: 2,
  defaultCenter: { lat: 30, lng: 0 },
  showFamilyTreeLines: true,
  showLegend: true,
  siteName: 'Alcohol Origins Map',
  siteDescription: 'An interactive map exploring the history and origins of alcoholic beverages',
  allowPublicViewing: true,
  requireLoginToView: false,
  autoBackupEnabled: false,
  backupFrequencyDays: 7,
};

export default function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    // Load settings from localStorage for now
    // In a production app, you'd fetch from an API/database
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Failed to parse saved settings');
      }
    }
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    try {
      // Save to localStorage for now
      // In a production app, you'd save to an API/database
      localStorage.setItem('appSettings', JSON.stringify(settings));

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus({ type: 'success', message: 'Settings saved successfully!' });
      setHasChanges(false);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    setStatus(null);
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
        <TabsList className="grid w-full grid-cols-3">
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
      </Tabs>
    </div>
  );
}
