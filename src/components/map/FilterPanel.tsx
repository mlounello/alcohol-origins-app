'use client';

import { useState } from 'react';
import { BeverageGroup } from '@/types/database';
import { BEVERAGE_GROUPS, BEVERAGE_TYPES, GROUP_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export interface FilterState {
  search: string;
  groups: BeverageGroup[];
  types: string[];
  yearRange: [number | null, number | null];
  country: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  countries: string[];
}

export function FilterPanel({
  filters,
  onFiltersChange,
  countries,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleGroupToggle = (group: BeverageGroup) => {
    const newGroups = filters.groups.includes(group)
      ? filters.groups.filter((g) => g !== group)
      : [...filters.groups, group];
    onFiltersChange({ ...filters, groups: newGroups });
  };

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      groups: [],
      types: [],
      yearRange: [null, null],
      country: '',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.groups.length > 0 ||
    filters.types.length > 0 ||
    filters.yearRange[0] !== null ||
    filters.yearRange[1] !== null ||
    filters.country;

  return (
    <div className="flex items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search beverages..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => onFiltersChange({ ...filters, search: '' })}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <SlidersHorizontal className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter Beverages</SheetTitle>
            <SheetDescription>
              Narrow down the beverages shown on the map
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Groups */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Beverage Groups</Label>
              <div className="flex flex-wrap gap-2">
                {BEVERAGE_GROUPS.map((group) => (
                  <button
                    key={group}
                    onClick={() => handleGroupToggle(group)}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                      transition-all border
                      ${
                        filters.groups.includes(group)
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: GROUP_COLORS[group],
                        border:
                          GROUP_COLORS[group] === '#FFFFFF'
                            ? '1px solid #666'
                            : 'none',
                      }}
                    />
                    {group}
                  </button>
                ))}
              </div>
            </div>

            {/* Types */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Beverage Types</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {BEVERAGE_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.types.includes(type)}
                      onCheckedChange={() => handleTypeToggle(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            {/* Country */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Country</Label>
              <Select
                value={filters.country}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, country: value === 'all' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Year Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="From"
                  value={filters.yearRange[0] ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      yearRange: [
                        e.target.value ? parseInt(e.target.value) : null,
                        filters.yearRange[1],
                      ],
                    })
                  }
                  className="w-28"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="number"
                  placeholder="To"
                  value={filters.yearRange[1] ?? ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      yearRange: [
                        filters.yearRange[0],
                        e.target.value ? parseInt(e.target.value) : null,
                      ],
                    })
                  }
                  className="w-28"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use negative numbers for BCE (e.g., -3000 for 3000 BCE)
              </p>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
