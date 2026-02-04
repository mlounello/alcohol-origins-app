'use client';

import { useGroups } from '@/providers/GroupsProvider';
import { getContrastTextColor } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

export default function GroupsPage() {
  const { groups, isLoading } = useGroups();

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Palette className="h-8 w-8" />
          Beverage Groups
        </h1>
        <p className="text-muted-foreground mt-2">
          Beverages are organized into groups based on their primary base ingredient.
          Use these descriptions as a reference when choosing which group a beverage belongs to.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No groups have been configured yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => {
            const textColor = getContrastTextColor(group.color);

            return (
              <Card key={group.id} className="overflow-hidden">
                <div className="flex">
                  {/* Color stripe */}
                  <div
                    className="w-2 flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <div className="flex-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                          style={{
                            backgroundColor: group.color,
                            color: textColor,
                            border: group.color === '#FFFFFF' ? '1px solid #ccc' : 'none',
                          }}
                        >
                          {group.name}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {group.description ? (
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {group.description}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          No description available for this group.
                        </p>
                      )}
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
