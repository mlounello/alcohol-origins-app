'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Beverage, BeverageGroup } from '@/types/database';
import { GROUP_COLORS, BEVERAGE_GROUPS } from '@/lib/constants';
import { formatDateText } from '@/lib/utils/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, MapPin, Calendar, Wine, Filter, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export default function BeveragesPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<BeverageGroup | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'recent'>('name');

  const canAdd = profile && ['contributor', 'editor', 'admin'].includes(profile.role);

  useEffect(() => {
    async function fetchBeverages() {
      try {
        const response = await fetch('/api/beverages');
        if (!response.ok) {
          throw new Error('Failed to fetch beverages');
        }
        const data = await response.json();
        setBeverages(data);
      } catch (err) {
        console.error('Error fetching beverages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load beverages');
      } finally {
        setLoading(false);
      }
    }

    fetchBeverages();
  }, []);

  const filteredBeverages = useMemo(() => {
    let result = [...beverages];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(searchLower) ||
          b.type.toLowerCase().includes(searchLower) ||
          b.origin_region?.toLowerCase().includes(searchLower) ||
          b.origin_country?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by group
    if (groupFilter !== 'all') {
      result = result.filter((b) => b.group === groupFilter);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        result.sort((a, b) => (a.date_year ?? 0) - (b.date_year ?? 0));
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        break;
    }

    return result;
  }, [beverages, search, groupFilter, sortBy]);

  if (loading) {
    return (
      <div className="container py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading beverages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Beverages</h1>
            <p className="text-muted-foreground">
              {beverages.length} beverages in the database
            </p>
          </div>
          {canAdd && (
            <Button asChild>
              <Link href="/beverages/new/edit">
                <Plus className="mr-2 h-4 w-4" /> Add Beverage
              </Link>
            </Button>
          )}
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search beverages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Select
              value={groupFilter}
              onValueChange={(value) => setGroupFilter(value as BeverageGroup | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {BEVERAGE_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="date">Oldest First</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        {search || groupFilter !== 'all' ? (
          <p className="text-sm text-muted-foreground">
            Showing {filteredBeverages.length} of {beverages.length} beverages
          </p>
        ) : null}

        {/* Beverages list */}
        {filteredBeverages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBeverages.map((beverage) => {
              const groupColor = GROUP_COLORS[beverage.group] || GROUP_COLORS.Other;

              return (
                <Link
                  key={beverage.id}
                  href={`/beverages/${beverage.id}`}
                  className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold line-clamp-1">{beverage.name}</h3>
                    <Badge
                      variant="secondary"
                      className="flex-shrink-0 gap-1"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: groupColor,
                          border: groupColor === '#FFFFFF' ? '1px solid #666' : 'none',
                        }}
                      />
                      {beverage.group}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Wine className="h-3 w-3" />
                      {beverage.type}
                    </p>
                    {(beverage.origin_region || beverage.origin_country) && (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {beverage.origin_region || beverage.origin_country}
                        {beverage.origin_region && beverage.origin_country && `, ${beverage.origin_country}`}
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateText(beverage.date_text, beverage.date_year)}
                    </p>
                  </div>

                  {beverage.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {beverage.description}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {search || groupFilter !== 'all'
                ? 'No beverages match your filters'
                : 'No beverages in the database yet'}
            </p>
            {canAdd && !search && groupFilter === 'all' && (
              <Button asChild>
                <Link href="/beverages/new/edit">
                  <Plus className="mr-2 h-4 w-4" /> Add First Beverage
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
