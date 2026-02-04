'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Beverage, Profile } from '@/types/database';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDateText } from '@/lib/utils/dates';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PendingBeverage extends Beverage {
  creator?: Pick<Profile, 'display_name' | 'email'> | null;
}

export default function ApprovalsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<PendingBeverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [selectedReject, setSelectedReject] = useState<PendingBeverage | null>(null);
  const rejectionTemplates = [
    'Missing a citation or source for key claims.',
    'Origin region/country appears incorrect or needs a source.',
    'Description needs more detail or is too speculative.',
    'Duplicate or too similar to an existing beverage.',
    'Dates are unclear; provide a numeric year or clear timeframe.',
  ];
  const [search, setSearch] = useState('');
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffItems, setDiffItems] = useState<Array<{ field: string; from: string; to: string }>>([]);
  const [diffTarget, setDiffTarget] = useState<PendingBeverage | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkRejectNotes, setBulkRejectNotes] = useState('');
  const [showRejected, setShowRejected] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDelete, setSelectedDelete] = useState<PendingBeverage | null>(null);

  const canApprove = profile && ['editor', 'moderator', 'admin'].includes(profile.role);

  useEffect(() => {
    async function fetchPending() {
      try {
        const response = await fetch(
          `/api/beverages/pending?page=${page}&pageSize=${pageSize}&sort=${sortOrder}&includeRejected=${showRejected ? 'true' : 'false'}`
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch pending beverages');
        }
        const payload = await response.json();
        setPending(payload.data || []);
        setTotalCount(typeof payload.total === 'number' ? payload.total : 0);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load queue');
      } finally {
        setLoading(false);
      }
    }

    if (canApprove) {
      fetchPending();
    } else {
      setLoading(false);
    }
  }, [canApprove, page, sortOrder, showRejected]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const handleApprove = async (beverageId: string, openAfter = false) => {
    setApprovingId(beverageId);
    try {
      const response = await fetch(`/api/beverages/${beverageId}/approve`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve beverage');
      }
      setPending((prev) => prev.filter((b) => b.id !== beverageId));
      toast.success('Beverage approved');
      window.dispatchEvent(new Event('approvals-updated'));
      if (openAfter) {
        router.push(`/beverages/${beverageId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve beverage');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedReject) return;

    setRejectingId(selectedReject.id);
    try {
      const response = await fetch(`/api/beverages/${selectedReject.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason, moderator_notes: moderatorNotes }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject beverage');
      }
      setPending((prev) => prev.filter((b) => b.id !== selectedReject.id));
      toast.success('Beverage rejected');
      window.dispatchEvent(new Event('approvals-updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject beverage');
    } finally {
      setRejectingId(null);
      setRejectOpen(false);
      setRejectionReason('');
      setModeratorNotes('');
      setSelectedReject(null);
    }
  };

  const backHref = profile?.role === 'admin' || profile?.role === 'moderator' ? '/admin' : '/map';
  const backLabel = backHref === '/admin' ? 'Back to Admin' : 'Back to Map';

  const filteredPending = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pending;
    return pending.filter((item) => {
      const submitter = `${item.creator?.display_name || ''} ${item.creator?.email || ''}`.toLowerCase();
      return item.name.toLowerCase().includes(term) || submitter.includes(term);
    });
  }, [pending, search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const formatPendingAge = (createdAt: string) => {
    const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
    return days === 1 ? '1 day' : `${days} days`;
  };

  const allSelected = filteredPending.length > 0 && filteredPending.every((item) => selectedIds.has(item.id));

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

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(filteredPending.map((item) => item.id));
    });
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      setApprovingId('bulk');
      const results = await Promise.all(ids.map((id) =>
        fetch(`/api/beverages/${id}/approve`, { method: 'POST' })
      ));
      const failed = results.filter((res) => !res.ok);
      if (failed.length > 0) {
        throw new Error('Some approvals failed');
      }
      setPending((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      toast.success(`Approved ${ids.length} submission(s)`);
      window.dispatchEvent(new Event('approvals-updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve selected');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      setRejectingId('bulk');
      const results = await Promise.all(ids.map((id) =>
        fetch(`/api/beverages/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejection_reason: bulkRejectReason, moderator_notes: bulkRejectNotes }),
        })
      ));
      const failed = results.filter((res) => !res.ok);
      if (failed.length > 0) {
        throw new Error('Some rejections failed');
      }
      setPending((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      toast.success(`Rejected ${ids.length} submission(s)`);
      window.dispatchEvent(new Event('approvals-updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject selected');
    } finally {
      setRejectingId(null);
      setBulkRejectOpen(false);
      setBulkRejectReason('');
      setBulkRejectNotes('');
    }
  };

  const handleRestore = async (beverageId: string) => {
    setRestoringId(beverageId);
    try {
      const response = await fetch(`/api/beverages/${beverageId}/resubmit`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to move back to queue');
      }
      const data = await response.json();
      setPending((prev) =>
        prev.map((item) => (item.id === beverageId ? data.beverage : item))
      );
      toast.success('Moved back to pending queue');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move back to queue');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedDelete) return;
    setDeletingId(selectedDelete.id);
    try {
      const response = await fetch(`/api/beverages/${selectedDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete beverage');
      }
      setPending((prev) => prev.filter((item) => item.id !== selectedDelete.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedDelete.id);
        return next;
      });
      toast.success('Submission deleted');
      window.dispatchEvent(new Event('approvals-updated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete submission');
    } finally {
      setDeletingId(null);
      setDeleteOpen(false);
      setSelectedDelete(null);
    }
  };

  if (!canApprove) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Only editors, moderators, and admins can approve beverages.</p>
      </div>
    );
  }

  const handleViewDiff = async (beverage: PendingBeverage) => {
    setDiffTarget(beverage);
    setDiffOpen(true);
    setDiffLoading(true);
    try {
      const response = await fetch(`/api/beverages/${beverage.id}/revisions`);
      if (!response.ok) {
        throw new Error('Failed to load revisions');
      }
      const revisions = await response.json();
      if (!Array.isArray(revisions) || revisions.length < 2) {
        setDiffItems([]);
        return;
      }
      const [latest, previous] = revisions;
      const latestData = latest.data || {};
      const previousData = previous.data || {};
      const fields = [
        'name',
        'type',
        'group',
        'origin_region',
        'origin_country',
        'date_text',
        'date_year',
        'description',
        'citation',
        'parent_id',
      ];
      const diff = fields
        .filter((field) => latestData[field] !== previousData[field])
        .map((field) => ({
          field,
          from: previousData[field] === undefined || previousData[field] === null ? '—' : String(previousData[field]),
          to: latestData[field] === undefined || latestData[field] === null ? '—' : String(latestData[field]),
        }));
      setDiffItems(diff);
    } catch {
      setDiffItems([]);
    } finally {
      setDiffLoading(false);
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>
            Review contributor submissions before they appear on the public map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by beverage or submitter"
            />
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              >
                Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
              </Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={showRejected}
                  onCheckedChange={(value) => setShowRejected(!!value)}
                />
                Show rejected
              </label>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredPending.length} items
              </div>
            </div>
          </div>
          <div className="sticky top-16 z-10 rounded-lg border bg-background/95 backdrop-blur px-3 py-2 mb-4 flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(value) => toggleSelectAll(!!value)}
              />
              Select all on page
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
                variant="outline"
                onClick={() => setBulkRejectOpen(true)}
                disabled={selectedIds.size === 0 || rejectingId === 'bulk'}
              >
                Reject Selected ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                onClick={handleApproveSelected}
                disabled={selectedIds.size === 0 || approvingId === 'bulk'}
              >
                {approvingId === 'bulk' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  `Approve Selected (${selectedIds.size})`
                )}
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading queue...
            </div>
          ) : filteredPending.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No submissions match this filter.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((beverage) => (
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
                      Pending for {formatPendingAge(beverage.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted by{' '}
                      {beverage.creator?.display_name ||
                        beverage.creator?.email ||
                        'Unknown user'}
                    </p>
                    {beverage.rejection_reason && (
                      <details className="mt-2 text-xs text-red-700">
                        <summary className="cursor-pointer font-medium">
                          View previous rejection feedback
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap">
                          {beverage.rejection_reason}
                        </p>
                      </details>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateText(beverage.date_text, beverage.date_year)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDiff(beverage)}
                    >
                      View changes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(beverage.id, false)}
                      disabled={approvingId === beverage.id || rejectingId === beverage.id}
                    >
                      {approvingId === beverage.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>
                    {beverage.approval_status === 'rejected' && showRejected && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(beverage.id)}
                        disabled={restoringId === beverage.id}
                      >
                        {restoringId === beverage.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          'Move to Pending'
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(beverage.id, true)}
                      disabled={approvingId === beverage.id || rejectingId === beverage.id}
                    >
                      Approve &amp; Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReject(beverage);
                        setRejectOpen(true);
                        setModeratorNotes('');
                        setRejectionReason('');
                      }}
                      disabled={approvingId === beverage.id || rejectingId === beverage.id}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedDelete(beverage);
                        setDeleteOpen(true);
                      }}
                      disabled={deletingId === beverage.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {totalCount} total
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Beverage</DialogTitle>
            <DialogDescription>
              Provide feedback so the submitter can revise and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={selectedReject?.name || ''} readOnly />
            <Textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Optional feedback (missing citation, incorrect region, etc.)"
              rows={4}
            />
            <div className="flex flex-wrap gap-2">
              {rejectionTemplates.map((template) => (
                <Button
                  key={template}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectionReason(template)}
                >
                  {template}
                </Button>
              ))}
            </div>
            <Textarea
              value={moderatorNotes}
              onChange={(event) => setModeratorNotes(event.target.value)}
              placeholder="Moderator notes (internal only)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={!!rejectingId}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={!!rejectingId}>
              {rejectingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Changes for {diffTarget?.name}</DialogTitle>
            <DialogDescription>
              Differences between the latest and previous revision.
            </DialogDescription>
          </DialogHeader>
          {diffLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading changes...
            </div>
          ) : diffItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No previous revision to compare.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              {diffItems.map((item) => (
                <div key={item.field} className="rounded border p-3">
                  <p className="font-semibold">{item.field}</p>
                  <p className="text-muted-foreground">From: {item.from}</p>
                  <p>To: {item.to}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiffOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Selected</DialogTitle>
            <DialogDescription>
              Add a rejection reason that will be shared with submitters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={bulkRejectReason}
              onChange={(event) => setBulkRejectReason(event.target.value)}
              placeholder="Optional feedback (missing citation, incorrect region, etc.)"
              rows={4}
            />
            <Textarea
              value={bulkRejectNotes}
              onChange={(event) => setBulkRejectNotes(event.target.value)}
              placeholder="Moderator notes (internal only)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)} disabled={rejectingId === 'bulk'}>
              Cancel
            </Button>
            <Button onClick={handleRejectSelected} disabled={rejectingId === 'bulk'}>
              {rejectingId === 'bulk' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Selected'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedDelete?.name}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!deletingId}>
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
