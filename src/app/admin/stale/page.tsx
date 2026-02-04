'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Beverage, Profile } from '@/types/database';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StaleBeverage extends Beverage {
  creator?: Pick<Profile, 'display_name' | 'email'> | null;
}

export default function StaleSubmissionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stale, setStale] = useState<StaleBeverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = profile && ['editor', 'moderator', 'admin'].includes(profile.role);

  useEffect(() => {
    async function fetchStale() {
      try {
        const response = await fetch(`/api/beverages/stale?days=${days}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load stale submissions');
        }
        const data = await response.json();
        setStale(data.data || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load stale submissions');
      } finally {
        setLoading(false);
      }
    }

    if (canManage) {
      setLoading(true);
      fetchStale();
    }
  }, [canManage, days]);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const allSelected = stale.length > 0 && stale.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(stale.map((item) => item.id));
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      const results = await Promise.all(ids.map((id) =>
        fetch(`/api/beverages/${id}`, { method: 'DELETE' })
      ));
      const failed = results.filter((res) => !res.ok);
      if (failed.length > 0) {
        throw new Error('Some deletions failed');
      }
      setStale((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      toast.success(`Deleted ${ids.length} submission(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete submissions');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (!canManage) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only editors, moderators, and admins can manage stale submissions.</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Stale Submissions</CardTitle>
          <CardDescription>
            Pending or rejected submissions that haven&apos;t been updated in {days} days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Older than
              <Input
                type="number"
                min={1}
                value={days}
                onChange={(event) => setDays(Math.max(1, Number(event.target.value || 1)))}
                className="w-20"
              />
              days
            </div>
            <div className="text-sm text-muted-foreground">
              {stale.length} submissions
            </div>
          </div>

          <div className="sticky top-16 z-10 rounded-lg border bg-background/95 backdrop-blur px-3 py-2 mb-4 flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(value) => toggleSelectAll(!!value)}
              />
              Select all
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
              >
                Clear selection
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedIds.size})
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading stale submissions...
            </div>
          ) : stale.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No stale submissions found.
            </p>
          ) : (
            <div className="space-y-3">
              {stale.map((beverage) => (
                <div
                  key={beverage.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border"
                >
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedIds.has(beverage.id)}
                      onCheckedChange={(value) => toggleSelected(beverage.id, !!value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/beverages/${beverage.id}`} className="font-semibold hover:underline">
                        {beverage.name}
                      </Link>
                      {beverage.approval_status === 'pending' && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {beverage.approval_status === 'rejected' && (
                        <Badge variant="destructive">Rejected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {beverage.type} · {beverage.group}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(beverage.updated_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted by{' '}
                      {beverage.creator?.display_name ||
                        beverage.creator?.email ||
                        'Unknown user'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedIds(new Set([beverage.id]));
                      setConfirmOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submissions</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedIds.size} submission(s). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
