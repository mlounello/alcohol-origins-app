'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Beverage } from '@/types/database';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatDateText } from '@/lib/utils/dates';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MySubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Beverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    action: 'approve' | 'reject';
    beverage_id: string | null;
    beverage_name: string | null;
    created_at: string;
  }>>([]);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const response = await fetch('/api/beverages/mine');
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch submissions');
        }
        const data = await response.json();
        setSubmissions(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchSubmissions();
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function fetchNotifications() {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  }

  const filteredSubmissions = submissions.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.approval_status === statusFilter;
  });

  const recentNotifications = useMemo(() => notifications.slice(0, 3), [notifications]);

  if (!user) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-muted-foreground">Please sign in to view your submissions.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>My Submissions</CardTitle>
          <CardDescription>
            Track the approval status of your submitted beverages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentNotifications.length > 0 && (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p className="font-semibold mb-2">Recent updates</p>
              <ul className="space-y-1">
                {recentNotifications.map((note) => (
                  <li key={note.id}>
                    {note.action === 'approve' ? 'Approved' : 'Rejected'}:{' '}
                    <Link className="underline" href={`/beverages/${note.beverage_id}`}>
                      {note.beverage_name || 'Beverage'}
                    </Link>{' '}
                    · {new Date(note.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-sm text-muted-foreground">
              {filteredSubmissions.length} of {submissions.length} submissions
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as 'all' | 'approved' | 'pending' | 'rejected')
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading submissions...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No submissions match this filter.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((beverage) => (
                <div
                  key={beverage.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border"
                >
                  <div>
                    <Link href={`/beverages/${beverage.id}`} className="font-semibold hover:underline">
                      {beverage.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {beverage.type} · {beverage.group}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateText(beverage.date_text, beverage.date_year)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(beverage.updated_at).toLocaleString()}
                    </p>
                    {beverage.approval_status === 'pending' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Pending for {Math.max(0, Math.floor((Date.now() - new Date(beverage.created_at).getTime()) / 86400000))} days
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(beverage.updated_at).toLocaleString()}
                    </p>
                    {beverage.approval_status === 'rejected' && beverage.rejection_reason && (
                      <details className="mt-2 text-xs text-red-700">
                        <summary className="cursor-pointer font-medium">View rejection feedback</summary>
                        <p className="mt-1 whitespace-pre-wrap">{beverage.rejection_reason}</p>
                      </details>
                    )}
                  </div>
                  <Badge
                    variant={
                      beverage.approval_status === 'approved'
                        ? 'secondary'
                        : beverage.approval_status === 'pending'
                          ? 'outline'
                          : 'destructive'
                    }
                  >
                    {beverage.approval_status === 'approved'
                      ? 'Approved'
                      : beverage.approval_status === 'pending'
                        ? 'Pending'
                        : 'Rejected'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
