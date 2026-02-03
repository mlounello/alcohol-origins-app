'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BeverageGroup } from '@/types/database';
import { GROUP_COLORS, getContrastTextColor } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Clock, RefreshCw } from 'lucide-react';

interface Activity {
  id: string;
  action: 'create' | 'edit' | 'revert' | 'delete';
  beverage_id: string;
  beverage_name: string;
  beverage_type: string;
  beverage_group: BeverageGroup;
  origin_region: string | null;
  origin_country: string | null;
  user_id: string | null;
  created_at: string;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getActionIcon(action: string) {
  switch (action) {
    case 'create':
      return <PlusCircle className="h-4 w-4 text-green-600" />;
    case 'edit':
      return <Edit className="h-4 w-4 text-blue-600" />;
    case 'revert':
      return <RefreshCw className="h-4 w-4 text-orange-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

function getActionText(action: string) {
  switch (action) {
    case 'create':
      return 'added';
    case 'edit':
      return 'updated';
    case 'revert':
      return 'reverted';
    case 'delete':
      return 'deleted';
    default:
      return 'modified';
  }
}

export default function RecentChangesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recent-changes?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch recent changes');
      }
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recent changes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recent Changes</h1>
            <p className="text-muted-foreground">
              See the latest edits and contributions to the database
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActivities}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>
              {activities.length > 0
                ? `Showing ${activities.length} recent changes`
                : 'Recent database activity'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground text-sm">Loading recent changes...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchActivities}>Try Again</Button>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No recent changes found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Changes will appear here when beverages are added or edited.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((activity, index) => {
                  const groupColor = GROUP_COLORS[activity.beverage_group] || GROUP_COLORS.Other;

                  return (
                    <div key={activity.id}>
                      <Link
                        href={`/beverages/${activity.beverage_id}`}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getActionIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {activity.beverage_name}
                            </span>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                              style={{
                                backgroundColor: groupColor,
                                color: getContrastTextColor(groupColor),
                                border: groupColor === '#FFFFFF' ? '1px solid #ccc' : 'none',
                              }}
                            >
                              {activity.beverage_group}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {activity.beverage_type}
                            {activity.origin_region && ` · ${activity.origin_region}`}
                            {activity.origin_country && !activity.origin_region && ` · ${activity.origin_country}`}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-xs text-muted-foreground capitalize">
                            {getActionText(activity.action)}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTimeAgo(activity.created_at)}
                          </p>
                        </div>
                      </Link>
                      {index < activities.length - 1 && (
                        <div className="border-b border-border/50 ml-11" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
