'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Beverage, BeverageRevision, Profile } from '@/types/database';
import { GROUP_COLORS, getContrastTextColor } from '@/lib/constants';
import { formatDateText } from '@/lib/utils/dates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  MapPin,
  Calendar,
  Wine,
  GitBranch,
  History,
  Lock,
  Unlock,
  ExternalLink,
  Loader2,
  Trash2,
  RotateCcw,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
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

export default function BeverageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [beverage, setBeverage] = useState<Beverage | null>(null);
  const [parent, setParent] = useState<Beverage | null>(null);
  const [children, setChildren] = useState<Beverage[]>([]);
  const [revisions, setRevisions] = useState<BeverageRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<BeverageRevision | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedByProfile, setApprovedByProfile] = useState<Pick<Profile, 'id' | 'display_name' | 'email'> | null>(null);
  const [rejectedByProfile, setRejectedByProfile] = useState<Pick<Profile, 'id' | 'display_name' | 'email'> | null>(null);

  const id = params.id as string;

  const fetchBeverage = useCallback(async () => {
    try {
      // Fetch beverage
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

      // Fetch parent if exists (parent_id is a node_id)
      if (data.parent_id) {
        const parentResponse = await fetch(`/api/beverages?node_id=${encodeURIComponent(data.parent_id)}`);
        if (parentResponse.ok) {
          const parentData = await parentResponse.json();
          if (parentData.length > 0) {
            setParent(parentData[0]);
          }
        }
      } else {
        setParent(null);
      }

      // Fetch children (beverages that have this beverage's node_id as parent_id)
      const childrenResponse = await fetch(`/api/beverages?parent_id=${encodeURIComponent(data.node_id)}`);
      if (childrenResponse.ok) {
        const childrenData = await childrenResponse.json();
        setChildren(childrenData);
      } else {
        setChildren([]);
      }

      // Fetch revisions
      const revisionsResponse = await fetch(`/api/beverages/${id}/revisions`);
      if (revisionsResponse.ok) {
        const revisionsData = await revisionsResponse.json();
        setRevisions(revisionsData);
      }
    } catch (err) {
      console.error('Error fetching beverage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load beverage');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchBeverage();
    }
  }, [id, fetchBeverage]);

  const canEdit = profile && ['contributor', 'editor', 'moderator', 'admin'].includes(profile.role);
  const canLock = profile && ['editor', 'moderator', 'admin'].includes(profile.role);
  const canDelete = profile && ['editor', 'moderator', 'admin'].includes(profile.role);
  const canRevert = profile && ['editor', 'moderator', 'admin'].includes(profile.role);
  const canResubmit = profile && profile.role === 'contributor' && beverage?.created_by === profile.id;
  const canApprove = profile && ['editor', 'moderator', 'admin'].includes(profile.role);

  const handleToggleLock = async () => {
    if (!beverage || !canLock) return;

    setLockLoading(true);
    try {
      const response = await fetch(`/api/beverages/${id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lock: !beverage.is_locked }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update lock status');
      }

      const data = await response.json();
      setBeverage({ ...beverage, is_locked: data.is_locked });
      toast.success(data.message);
    } catch (err) {
      console.error('Error toggling lock:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update lock status');
    } finally {
      setLockLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!beverage || !canDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/beverages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete beverage');
      }

      toast.success('Beverage deleted');
      router.push('/beverages');
    } catch (err) {
      console.error('Error deleting beverage:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete beverage');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleRevert = async () => {
    if (!selectedRevision || !canRevert) return;

    setReverting(true);
    try {
      const response = await fetch(`/api/beverages/${id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision_id: selectedRevision.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revert beverage');
      }

      const data = await response.json();
      setBeverage(data.beverage);
      toast.success(`Reverted to revision #${selectedRevision.revision_number}`);
      await fetchBeverage();
    } catch (err) {
      console.error('Error reverting beverage:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to revert beverage');
    } finally {
      setReverting(false);
      setRevertOpen(false);
      setSelectedRevision(null);
    }
  };

  const handleResubmit = async () => {
    if (!beverage || !canResubmit) return;

    setResubmitting(true);
    try {
      const response = await fetch(`/api/beverages/${id}/resubmit`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resubmit beverage');
      }

      const data = await response.json();
      setBeverage(data.beverage);
      toast.success('Beverage resubmitted for approval');
      await fetchBeverage();
    } catch (err) {
      console.error('Error resubmitting beverage:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to resubmit beverage');
    } finally {
      setResubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!beverage || !canApprove) return;

    setApproving(true);
    try {
      const response = await fetch(`/api/beverages/${id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve beverage');
      }

      const data = await response.json();
      setBeverage(data.beverage);
      toast.success('Beverage approved');
      await fetchBeverage();
    } catch (err) {
      console.error('Error approving beverage:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to approve beverage');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!beverage || !canApprove) return;

    setRejecting(true);
    try {
      const response = await fetch(`/api/beverages/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject beverage');
      }

      const data = await response.json();
      setBeverage(data.beverage);
      toast.success('Beverage rejected');
      await fetchBeverage();
    } catch (err) {
      console.error('Error rejecting beverage:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to reject beverage');
    } finally {
      setRejecting(false);
      setRejectOpen(false);
      setRejectionReason('');
    }
  };

  useEffect(() => {
    async function fetchModerationProfiles() {
      if (!beverage) return;

      if (beverage.approved_by) {
        const response = await fetch(`/api/profiles/${beverage.approved_by}`);
        if (response.ok) {
          const data = await response.json();
          setApprovedByProfile(data);
        }
      } else {
        setApprovedByProfile(null);
      }

      if (beverage.rejected_by) {
        const response = await fetch(`/api/profiles/${beverage.rejected_by}`);
        if (response.ok) {
          const data = await response.json();
          setRejectedByProfile(data);
        }
      } else {
        setRejectedByProfile(null);
      }
    }

    fetchModerationProfiles();
  }, [beverage]);

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

  if (error || !beverage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {error || 'Beverage not found'}
          </h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const groupColor = GROUP_COLORS[beverage.group] || GROUP_COLORS.Other;

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{beverage.name}</h1>
            {beverage.is_locked && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            )}
            {beverage.approval_status === 'pending' && (
              <Badge variant="outline" className="gap-1">
                Pending Approval
              </Badge>
            )}
            {beverage.approval_status === 'rejected' && (
              <Badge variant="destructive" className="gap-1">
                Rejected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wine className="h-4 w-4" />
              {beverage.type}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: groupColor,
                color: getContrastTextColor(groupColor),
                border: groupColor === '#FFFFFF' ? '1px solid #ccc' : 'none',
              }}
            >
              {beverage.group}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canLock && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              disabled={lockLoading}
              className={beverage.is_locked ? 'text-orange-600 hover:text-orange-700' : ''}
            >
              {lockLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : beverage.is_locked ? (
                <Unlock className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {beverage.is_locked ? 'Unlock' : 'Lock'}
            </Button>
          )}
          {canApprove && beverage.approval_status === 'pending' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectOpen(true)}
                disabled={approving || rejecting}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {canEdit && (
            <Button asChild>
              <Link href={`/beverages/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
          {canResubmit && beverage.approval_status === 'rejected' && (
            <Button onClick={handleResubmit} disabled={resubmitting}>
              {resubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Resubmit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="family">Family Tree</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

      {/* Details Tab */}
      <TabsContent value="details" className="space-y-6">
        {(beverage.approval_status !== 'approved' ||
          beverage.approved_at ||
          beverage.rejected_at) && (
          <Card>
            <CardHeader>
              <CardTitle>Moderation</CardTitle>
              <CardDescription>Approval and review status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                {beverage.approval_status === 'approved'
                  ? 'Approved'
                  : beverage.approval_status === 'pending'
                    ? 'Pending'
                    : 'Rejected'}
              </p>
              {beverage.approved_at && (
                <p>
                  <span className="text-muted-foreground">Approved:</span>{' '}
                  {approvedByProfile?.display_name || approvedByProfile?.email || beverage.approved_by}{' '}
                  on {new Date(beverage.approved_at).toLocaleString()}
                </p>
              )}
              {beverage.rejected_at && (
                <p>
                  <span className="text-muted-foreground">Rejected:</span>{' '}
                  {rejectedByProfile?.display_name || rejectedByProfile?.email || beverage.rejected_by}{' '}
                  on {new Date(beverage.rejected_at).toLocaleString()}
                </p>
              )}
              {canApprove && beverage.moderator_notes && (
                <p>
                  <span className="text-muted-foreground">Moderator notes:</span>{' '}
                  {beverage.moderator_notes}
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {beverage.approval_status === 'rejected' && beverage.rejection_reason && (
          <Card>
            <CardHeader>
              <CardTitle>Rejection Feedback</CardTitle>
              <CardDescription>
                This submission was rejected. You can edit and resubmit with the requested changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{beverage.rejection_reason}</p>
            </CardContent>
          </Card>
        )}
        <div className="grid md:grid-cols-2 gap-6">
            {/* Origin Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Origin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {beverage.origin_region && (
                  <p>
                    <span className="text-muted-foreground">Region:</span>{' '}
                    {beverage.origin_region}
                  </p>
                )}
                {beverage.origin_country && (
                  <p>
                    <span className="text-muted-foreground">Country:</span>{' '}
                    {beverage.origin_country}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Coordinates:</span>{' '}
                  {beverage.latitude.toFixed(4)}, {beverage.longitude.toFixed(4)}
                </p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link
                    href={`/map?lat=${beverage.latitude}&lng=${beverage.longitude}&zoom=8`}
                  >
                    View on Map <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Date Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {formatDateText(beverage.date_text, beverage.date_year)}
                </p>
                {beverage.date_year && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Numeric year: {beverage.date_year}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {beverage.image_url && (
            <Card>
              <CardHeader>
                <CardTitle>Bottle Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={beverage.image_url}
                  alt={`${beverage.name} bottle`}
                  className="max-h-[420px] w-full rounded-md object-contain bg-muted/20"
                />
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {beverage.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{beverage.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Citation */}
          {beverage.citation && (
            <Card>
              <CardHeader>
                <CardTitle>Citation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">
                  {beverage.citation}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Family Tree Tab */}
        <TabsContent value="family" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" /> Family Relationships
              </CardTitle>
              <CardDescription>
                Beverages derived from or related to {beverage.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Parent */}
              {parent && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Derived From
                  </h4>
                  <Link
                    href={`/beverages/${parent.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{parent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {parent.type} · {parent.origin_country || parent.origin_region || 'Unknown origin'}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{
                        backgroundColor: GROUP_COLORS[parent.group],
                        color: getContrastTextColor(GROUP_COLORS[parent.group]),
                        border: GROUP_COLORS[parent.group] === '#FFFFFF' ? '1px solid #ccc' : 'none',
                      }}
                    >
                      {parent.group}
                    </span>
                  </Link>
                </div>
              )}

              {/* Children */}
              {children.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Descendants ({children.length})
                  </h4>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/beverages/${child.id}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {child.type} · {child.origin_country || child.origin_region || 'Unknown origin'}
                          </p>
                        </div>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                          style={{
                            backgroundColor: GROUP_COLORS[child.group],
                            color: getContrastTextColor(GROUP_COLORS[child.group]),
                            border: GROUP_COLORS[child.group] === '#FFFFFF' ? '1px solid #ccc' : 'none',
                          }}
                        >
                          {child.group}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {!parent && children.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No family relationships recorded for this beverage.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Revision History
              </CardTitle>
              <CardDescription>
                Track changes made to this entry over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revisions.length > 0 ? (
                <div className="space-y-4">
                  {revisions.map((revision, index) => (
                    <div
                      key={revision.id}
                      className={`flex gap-4 ${
                        index !== revisions.length - 1 ? 'pb-4 border-b' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">
                          #{revision.revision_number}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {revision.edit_summary || 'Updated'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(revision.created_at).toLocaleString()}
                        </p>
                      </div>
                      {canRevert && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRevision(revision);
                            setRevertOpen(true);
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Revert
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No revision history available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Beverage</DialogTitle>
          <DialogDescription>
            This will permanently delete {beverage?.name}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
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

    <Dialog open={revertOpen} onOpenChange={setRevertOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revert Beverage</DialogTitle>
          <DialogDescription>
            Revert {beverage?.name} to revision #{selectedRevision?.revision_number}? This will create a new revision.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRevertOpen(false)} disabled={reverting}>
            Cancel
          </Button>
          <Button onClick={handleRevert} disabled={reverting}>
            {reverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reverting...
              </>
            ) : (
              'Revert'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Beverage</DialogTitle>
          <DialogDescription>
            Provide feedback so the submitter can revise and resubmit.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="Optional feedback (missing citation, incorrect region, etc.)"
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>
            Cancel
          </Button>
          <Button onClick={handleReject} disabled={rejecting}>
            {rejecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              'Reject'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
