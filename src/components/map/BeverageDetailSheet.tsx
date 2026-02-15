'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Beverage, BeverageGroup } from '@/types/database';
import { GROUP_COLORS, BEVERAGE_GROUPS, BEVERAGE_TYPES, getContrastTextColor } from '@/lib/constants';
import { formatDateText } from '@/lib/utils/dates';
import { useAuth } from '@/providers/AuthProvider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Calendar,
  Wine,
  GitBranch,
  Edit,
  Save,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface BeverageDetailSheetProps {
  beverage: Beverage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (beverage: Beverage) => void;
  allBeverages?: Beverage[];
}

type BeverageSheetFormData = {
  name: string;
  type: string;
  group: BeverageGroup;
  latitude: number;
  longitude: number;
  origin_region: string;
  origin_country: string;
  date_year: number | null;
  date_text: string;
  description: string;
  citation: string;
  parent_id: string | null;
};

export function BeverageDetailSheet({
  beverage,
  open,
  onOpenChange,
  onSave,
  allBeverages = [],
}: BeverageDetailSheetProps) {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parent, setParent] = useState<Beverage | null>(null);
  const [children, setChildren] = useState<Beverage[]>([]);

  const canEdit = profile && ['contributor', 'editor', 'admin'].includes(profile.role);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BeverageSheetFormData>({
    defaultValues: {
      name: '',
      type: '',
      group: 'Other' as BeverageGroup,
      latitude: 0,
      longitude: 0,
      origin_region: '',
      origin_country: '',
      date_year: null as number | null,
      date_text: '',
      description: '',
      citation: '',
      parent_id: null as string | null,
    },
  });

  // Reset form when beverage changes
  useEffect(() => {
    if (beverage) {
      reset({
        name: beverage.name,
        type: beverage.type,
        group: beverage.group,
        latitude: beverage.latitude,
        longitude: beverage.longitude,
        origin_region: beverage.origin_region || '',
        origin_country: beverage.origin_country || '',
        date_year: beverage.date_year,
        date_text: beverage.date_text || '',
        description: beverage.description || '',
        citation: beverage.citation || '',
        parent_id: beverage.parent_id,
      });
      setIsEditing(false);

      // Find parent and children (parent_id references node_id)
      if (beverage.parent_id) {
        const parentBev = allBeverages.find((b) => b.node_id === beverage.parent_id);
        setParent(parentBev || null);
      } else {
        setParent(null);
      }

      const childBeverages = allBeverages.filter((b) => b.parent_id === beverage.node_id);
      setChildren(childBeverages);
    }
  }, [beverage, allBeverages, reset]);

  const onSubmit = async (data: BeverageSheetFormData) => {
    if (!beverage || !canEdit) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/beverages/${beverage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      const updated = await response.json();
      toast.success('Changes saved!');
      setIsEditing(false);
      onSave?.(updated);
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!beverage) return null;

  const groupColor = GROUP_COLORS[beverage.group] || GROUP_COLORS.Other;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{beverage.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Wine className="h-4 w-4" />
                {beverage.type}
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-1"
                  style={{
                    backgroundColor: groupColor,
                    color: getContrastTextColor(groupColor),
                    border: groupColor === '#FFFFFF' ? '1px solid #ccc' : 'none',
                  }}
                >
                  {beverage.group}
                </span>
              </SheetDescription>
            </div>
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name', { required: true })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={watch('type')}
                  onValueChange={(value) => setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BEVERAGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={watch('group')}
                  onValueChange={(value) => setValue('group', value as BeverageGroup)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BEVERAGE_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  {...register('latitude', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  {...register('longitude', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin_region">Region</Label>
                <Input id="origin_region" {...register('origin_region')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin_country">Country</Label>
                <Input id="origin_country" {...register('origin_country')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_year">Year (numeric)</Label>
                <Input
                  id="date_year"
                  type="number"
                  {...register('date_year', { valueAsNumber: true })}
                  placeholder="-3500 for BCE"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_text">Date (text)</Label>
                <Input
                  id="date_text"
                  {...register('date_text')}
                  placeholder="e.g., 3500 BCE"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="citation">Citation</Label>
              <Textarea id="citation" {...register('citation')} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Derived From (Parent Beverage)</Label>
              <Select
                value={watch('parent_id') || 'none'}
                onValueChange={(value) => setValue('parent_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent beverage (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {allBeverages
                    .filter((b) => b.id !== beverage?.id)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.node_id}>
                        {b.name} ({b.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" /> Save Changes
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Tabs defaultValue="details" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">
                Details
              </TabsTrigger>
              <TabsTrigger value="family" className="flex-1">
                Family
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {beverage.image_url && (
                <div>
                  <img
                    src={beverage.image_url}
                    alt={`${beverage.name} bottle`}
                    className="h-48 w-full rounded-md object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {beverage.origin_region || 'Unknown region'}
                    {beverage.origin_country && `, ${beverage.origin_country}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDateText(beverage.date_text, beverage.date_year)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Coordinates: {beverage.latitude.toFixed(4)}, {beverage.longitude.toFixed(4)}
                </div>
              </div>

              {beverage.description && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {beverage.description}
                  </p>
                </div>
              )}

              {beverage.citation && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Source</h4>
                  <p className="text-sm text-muted-foreground italic">{beverage.citation}</p>
                </div>
              )}

              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href={`/beverages/${beverage.id}`}>
                  View Full Details <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            </TabsContent>

            <TabsContent value="family" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Family Relationships</span>
              </div>

              {parent && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Derived From
                  </h4>
                  <button
                    className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      // Could trigger selection of parent
                    }}
                  >
                    <span className="font-medium">{parent.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({parent.type})
                    </span>
                  </button>
                </div>
              )}

              {children.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Descendants ({children.length})
                  </h4>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{child.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({child.type})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!parent && children.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No family relationships recorded.
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
