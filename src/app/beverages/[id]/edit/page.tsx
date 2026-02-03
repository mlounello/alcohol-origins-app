'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Beverage, BeverageGroup } from '@/types/database';
import { BEVERAGE_GROUPS, BEVERAGE_TYPES } from '@/lib/constants';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

const beverageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  group: z.enum(['Grain', 'Grape', 'Sugar', 'Cactus', 'Other'] as const),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  origin_region: z.string().optional(),
  origin_country: z.string().optional(),
  date_year: z.number().optional().nullable(),
  date_text: z.string().optional(),
  description: z.string().optional(),
  citation: z.string().optional(),
  parent_id: z.string().optional().nullable(),
  change_summary: z.string().optional(),
});

type BeverageFormData = z.infer<typeof beverageSchema>;

export default function EditBeveragePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [beverage, setBeverage] = useState<Beverage | null>(null);
  const [allBeverages, setAllBeverages] = useState<Beverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;
  const isNew = id === 'new';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BeverageFormData>({
    resolver: zodResolver(beverageSchema),
    defaultValues: {
      name: '',
      type: '',
      group: 'Other',
      latitude: 0,
      longitude: 0,
      origin_region: '',
      origin_country: '',
      date_year: null,
      date_text: '',
      description: '',
      citation: '',
      parent_id: null,
      change_summary: '',
    },
  });

  const canEdit = profile && ['contributor', 'editor', 'admin'].includes(profile.role);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all beverages for parent dropdown
        const allResponse = await fetch('/api/beverages');
        if (allResponse.ok) {
          const allData = await allResponse.json();
          setAllBeverages(allData.filter((b: Beverage) => b.id !== id));
        }

        if (!isNew) {
          // Fetch current beverage
          const response = await fetch(`/api/beverages/${id}`);
          if (!response.ok) {
            if (response.status === 404) {
              setError('Beverage not found');
            } else {
              throw new Error('Failed to fetch beverage');
            }
            return;
          }
          const data = await response.json();
          setBeverage(data);

          // Populate form
          setValue('name', data.name);
          setValue('type', data.type);
          setValue('group', data.group);
          setValue('latitude', data.latitude);
          setValue('longitude', data.longitude);
          setValue('origin_region', data.origin_region || '');
          setValue('origin_country', data.origin_country || '');
          setValue('date_year', data.date_year);
          setValue('date_text', data.date_text || '');
          setValue('description', data.description || '');
          setValue('citation', data.citation || '');
          setValue('parent_id', data.parent_id);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, isNew, setValue]);

  const onSubmit = async (data: BeverageFormData) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit beverages');
      return;
    }

    setSaving(true);

    try {
      const url = isNew ? '/api/beverages' : `/api/beverages/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save beverage');
      }

      const savedBeverage = await response.json();
      toast.success(isNew ? 'Beverage created!' : 'Beverage updated!');
      router.push(`/beverages/${savedBeverage.id}`);
    } catch (err) {
      console.error('Error saving beverage:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save beverage');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-muted-foreground mb-4">
          You must be logged in to {isNew ? 'create' : 'edit'} beverages.
        </p>
        <Button asChild>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Permission Denied</h1>
        <p className="text-muted-foreground mb-4">
          You do not have permission to {isNew ? 'create' : 'edit'} beverages.
          Please contact an administrator to upgrade your account.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">{error}</h1>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Create New Beverage' : `Edit ${beverage?.name}`}</CardTitle>
          <CardDescription>
            {isNew
              ? 'Add a new beverage to the database'
              : 'Update the information for this beverage'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Belgian Witbier"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={watch('type')}
                  onValueChange={(value) => setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BEVERAGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group *</Label>
              <Select
                value={watch('group')}
                onValueChange={(value) => setValue('group', value as BeverageGroup)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {BEVERAGE_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.group && (
                <p className="text-sm text-red-500">{errors.group.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  {...register('latitude')}
                  placeholder="e.g., 50.8503"
                />
                {errors.latitude && (
                  <p className="text-sm text-red-500">{errors.latitude.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  {...register('longitude')}
                  placeholder="e.g., 4.3517"
                />
                {errors.longitude && (
                  <p className="text-sm text-red-500">{errors.longitude.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin_region">Origin Region</Label>
                <Input
                  id="origin_region"
                  {...register('origin_region')}
                  placeholder="e.g., Flanders"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="origin_country">Origin Country</Label>
                <Input
                  id="origin_country"
                  {...register('origin_country')}
                  placeholder="e.g., Belgium"
                />
              </div>
            </div>

            {/* Date */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_year">Year (numeric)</Label>
                <Input
                  id="date_year"
                  type="number"
                  {...register('date_year')}
                  placeholder="e.g., 1445 or -3000 for BCE"
                />
                <p className="text-xs text-muted-foreground">
                  Use negative numbers for BCE
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_text">Date (text)</Label>
                <Input
                  id="date_text"
                  {...register('date_text')}
                  placeholder="e.g., 15th century, ~3000 BCE"
                />
              </div>
            </div>

            {/* Parent */}
            <div className="space-y-2">
              <Label htmlFor="parent_id">Derived From (Parent Beverage)</Label>
              <Select
                value={watch('parent_id') || 'none'}
                onValueChange={(value) => setValue('parent_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent beverage (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {allBeverages.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the beverage, its history, and characteristics..."
                rows={4}
              />
            </div>

            {/* Citation */}
            <div className="space-y-2">
              <Label htmlFor="citation">Citation / Source</Label>
              <Textarea
                id="citation"
                {...register('citation')}
                placeholder="Reference sources for this information..."
                rows={2}
              />
            </div>

            {/* Change Summary (only for edits) */}
            {!isNew && (
              <div className="space-y-2">
                <Label htmlFor="change_summary">Change Summary</Label>
                <Input
                  id="change_summary"
                  {...register('change_summary')}
                  placeholder="Briefly describe your changes..."
                />
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isNew ? 'Create' : 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
